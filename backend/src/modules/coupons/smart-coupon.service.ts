import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { SmartCoupon, SmartCouponFixture } from './entities/smart-coupon.entity';
import { Fixture } from '../fixtures/entities/fixture.entity';
import { FixtureOdd } from '../fixtures/entities/fixture-odd.entity';
import { EnabledLeague } from '../fixtures/entities/enabled-league.entity';
import { ApiPredictionsService } from '../fixtures/api-predictions.service';

const CONFIDENCE_THRESHOLD = 0.7;
const DC_ODDS_ESTIMATE = 1.3;
const TARGET_ODDS_MIN = 1.55;
const TARGET_ODDS_MAX = 2.1;

export interface SafeTip {
  fixtureId: number;
  apiId: number;
  home: string;
  away: string;
  league: string;
  matchDate: Date;
  dateStr: string;
  market: string;
  tip: string;
  confidence: number;
  odds: number;
}

@Injectable()
export class SmartCouponService {
  private readonly logger = new Logger(SmartCouponService.name);

  constructor(
    @InjectRepository(SmartCoupon)
    private couponRepo: Repository<SmartCoupon>,
    @InjectRepository(Fixture)
    private fixtureRepo: Repository<Fixture>,
    @InjectRepository(FixtureOdd)
    private oddsRepo: Repository<FixtureOdd>,
    @InjectRepository(EnabledLeague)
    private enabledLeagueRepo: Repository<EnabledLeague>,
    private apiPredictionsService: ApiPredictionsService,
  ) { }

  private parsePercent(val: string | number): number {
    if (typeof val === 'number') return Math.min(1, Math.max(0, val));
    const s = String(val || '').replace(/[^\d.]/g, '');
    const n = parseFloat(s);
    if (isNaN(n)) return 0;
    return Math.min(1, Math.max(0, n > 1 ? n / 100 : n));
  }

  /**
   * Parse API-Football advice into Double Chance tip with confidence.
   * Returns null if Over/Under, BTTS, or invalid.
   */
  private parseAdviceToDoubleChance(
    advice: string,
    percent: { home: string; draw: string; away: string },
    homeTeam: string,
    awayTeam: string,
  ): { tip: string; confidence: number } | null {
    const a = (advice || '').trim();
    if (!a) return null;

    const mainBet = a.includes(' and ') ? a.split(' and ')[0].replace(/^Combo\s*/i, '') : a;

    // Exclude Over/Under and BTTS
    if (/goals|over|under|o\s*\/\s*u|u\s*\/\s*o/i.test(a)) return null;
    if (/both teams to score|btts/i.test(a)) return null;

    // Direct Double Chance
    const dcMatch = mainBet.match(/Double\s*[Cc]hance\s*:\s*(.+)/i);
    if (dcMatch) {
      const tipRaw = dcMatch[1].trim();
      const tipLower = tipRaw.toLowerCase();
      const homePct = this.parsePercent(percent.home);
      const drawPct = this.parsePercent(percent.draw);
      const awayPct = this.parsePercent(percent.away);

      let confidence = 0;
      let tip = 'Home or Draw';
      if ((tipLower.includes('home') || tipLower.includes('1')) && (tipLower.includes('draw') || tipLower.includes('x'))) {
        confidence = homePct + drawPct;
        tip = 'Home or Draw';
      } else if ((tipLower.includes('away') || tipLower.includes('2')) && (tipLower.includes('draw') || tipLower.includes('x'))) {
        confidence = awayPct + drawPct;
        tip = 'Draw or Away';
      } else if ((tipLower.includes('home') || tipLower.includes('1')) && (tipLower.includes('away') || tipLower.includes('2'))) {
        confidence = homePct + awayPct;
        tip = 'Home or Away';
      } else {
        confidence = 0.75;
        tip = tipRaw;
      }

      return { tip, confidence };
    }

    // Smart Conversion: Winner → Double Chance
    const winnerMatch = mainBet.match(/Winner\s*:\s*(.+)/i);
    if (winnerMatch) {
      const pick = winnerMatch[1].trim().toLowerCase();
      let winnerConf = 0;
      if (pick === 'draw' || pick.includes('draw')) {
        winnerConf = this.parsePercent(percent.draw);
      } else if (pick.includes(homeTeam.toLowerCase()) || pick === 'home') {
        winnerConf = this.parsePercent(percent.home);
      } else if (pick.includes(awayTeam.toLowerCase()) || pick === 'away') {
        winnerConf = this.parsePercent(percent.away);
      } else {
        return null;
      }

      const confidence = Math.min(0.95, winnerConf + 0.15);
      let tip = 'Home or Draw';
      if (pick.includes(awayTeam.toLowerCase()) || pick === 'away') {
        tip = 'Draw or Away';
      } else if (pick.includes(homeTeam.toLowerCase()) || pick === 'home') {
        tip = 'Home or Draw';
      } else if (pick === 'draw' || pick.includes('draw')) {
        tip = 'Home or Draw'; // conservative: home or draw covers draw
      }

      return { tip, confidence };
    }

    return null;
  }

  /**
   * Get DC odds from fixture_odds or estimate.
   */
  private async getDCOdds(fixtureId: number): Promise<number> {
    const odds = await this.oddsRepo.find({
      where: { fixtureId },
    });
    for (const o of odds) {
      const mn = (o.marketName || '').toLowerCase();
      const mv = (o.marketValue || '').toLowerCase();
      if (mn.includes('double chance')) {
        if (mv.includes('1x') || mv.includes('home') && mv.includes('draw')) return Number(o.odds);
        if (mv.includes('x2') || mv.includes('draw') && mv.includes('away')) return Number(o.odds);
        if (mv.includes('12') || mv.includes('home') && mv.includes('away')) return Number(o.odds);
      }
    }
    return DC_ODDS_ESTIMATE;
  }

  /**
   * Generate Smart Coupons: fetch fixtures (7 days, all enabled leagues), parse advice, pair by date.
   */
  async generateCoupons(): Promise<SmartCoupon[]> {
    const now = new Date();
    const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const enabledLeagues = await this.enabledLeagueRepo.find({
      where: { isActive: true },
      select: ['apiId'],
    });
    const enabledApiIds = enabledLeagues.map((l) => l.apiId);
    if (enabledApiIds.length === 0) {
      this.logger.warn('No enabled leagues found');
      return [];
    }

    const fixtures = await this.fixtureRepo
      .createQueryBuilder('f')
      .innerJoin('f.league', 'l')
      .addSelect(['l.id', 'l.name', 'l.apiId'])
      .where("f.status IN ('NS', 'TBD')")
      .andWhere('f.match_date >= :now', { now })
      .andWhere('f.match_date <= :end', { end: endDate })
      .andWhere('l.apiId IN (:...ids)', { ids: enabledApiIds })
      .orderBy('f.match_date', 'ASC')
      .getMany();

    const safeTips: SafeTip[] = [];

    for (const f of fixtures) {
      const pred = await this.apiPredictionsService.getPredictionWithAdvice(f.apiId);
      if (!pred) continue;

      const parsed = this.parseAdviceToDoubleChance(
        pred.advice,
        pred.percent,
        f.homeTeamName || 'Home',
        f.awayTeamName || 'Away',
      );
      if (!parsed || parsed.confidence < CONFIDENCE_THRESHOLD) continue;

      const odds = await this.getDCOdds(f.id);
      const dateStr = f.matchDate.toISOString().slice(0, 10);

      safeTips.push({
        fixtureId: f.id,
        apiId: f.apiId,
        home: f.homeTeamName || 'Home',
        away: f.awayTeamName || 'Away',
        league: f.league?.name || f.leagueName || 'Unknown',
        matchDate: f.matchDate,
        dateStr,
        market: 'Double Chance',
        tip: parsed.tip,
        confidence: parsed.confidence,
        odds,
      });

      await new Promise((r) => setTimeout(r, 150)); // rate limit
    }

    const byDate = new Map<string, SafeTip[]>();
    for (const t of safeTips) {
      const list = byDate.get(t.dateStr) || [];
      list.push(t);
      byDate.set(t.dateStr, list);
    }

    const coupons: SmartCoupon[] = [];
    for (const [dateStr, tips] of byDate) {
      const sorted = tips.sort((a, b) => b.confidence - a.confidence);
      const top2 = sorted.slice(0, 2);
      if (top2.length < 2) continue;

      const totalOdds = top2.reduce((acc, t) => acc * t.odds, 1);
      if (totalOdds < TARGET_ODDS_MIN || totalOdds > TARGET_ODDS_MAX) continue;

      const coupon = this.couponRepo.create({
        date: dateStr,
        totalOdds: Math.round(totalOdds * 1000) / 1000,
        status: 'pending',
        profit: 0,
        fixtures: top2.map(
          (t): SmartCouponFixture => ({
            fixtureId: t.fixtureId,
            apiId: t.apiId,
            home: t.home,
            away: t.away,
            league: t.league,
            market: t.market,
            tip: t.tip,
            confidence: t.confidence,
            odds: t.odds,
            status: 'pending',
          }),
        ),
      });
      await this.couponRepo.save(coupon);
      coupons.push(coupon);
    }

    this.logger.log(`Generated ${coupons.length} Smart Coupons`);
    return coupons;
  }

  async getHighValueCoupons(limit = 8): Promise<SmartCoupon[]> {
    const now = new Date().toISOString().slice(0, 10);
    const coupons = await this.couponRepo.find({
      where: { date: MoreThanOrEqual(now), status: 'pending' },
      order: { date: 'ASC', totalOdds: 'ASC' },
      take: limit,
    });
    return this.mapWithFixtureDetails(coupons);
  }

  async getById(id: number): Promise<SmartCoupon | null> {
    const coupon = await this.couponRepo.findOne({ where: { id } });
    if (!coupon) return null;
    const [enriched] = await this.mapWithFixtureDetails([coupon]);
    return enriched;
  }

  async getArchive(filters?: { from?: string; to?: string; status?: string }): Promise<SmartCoupon[]> {
    const qb = this.couponRepo.createQueryBuilder('c');
    if (filters?.from) {
      qb.andWhere('c.date >= :from', { from: filters.from });
    }
    if (filters?.to) {
      qb.andWhere('c.date <= :to', { to: filters.to });
    }
    if (filters?.status) {
      qb.andWhere('c.status = :status', { status: filters.status });
    } else {
      qb.andWhere("c.status IN ('won', 'lost')");
    }

    // Debug logging for query execution
    const sql = qb.orderBy('c.date', 'DESC').take(100).getSql();
    this.logger.log(`Archive Query: ${sql} Params: ${JSON.stringify(qb.getParameters())}`);

    const coupons = await qb.orderBy('c.date', 'DESC').take(100).getMany();
    this.logger.log(`Found ${coupons.length} coupons matching filters`);
    return this.mapWithFixtureDetails(coupons);
  }

  async getArchiveStats(): Promise<{ total: number; won: number; lost: number; roi: number }> {
    const [won, lost] = await Promise.all([
      this.couponRepo.count({ where: { status: 'won' } }),
      this.couponRepo.count({ where: { status: 'lost' } }),
    ]);
    const total = won + lost;
    const settled = won + lost;
    const profits = await this.couponRepo
      .createQueryBuilder('c')
      .select('SUM(c.profit)', 'sum')
      .where("c.status IN ('won', 'lost')")
      .getRawOne<{ sum: string }>();
    const totalProfit = parseFloat(profits?.sum || '0');
    const roi = settled > 0 ? (totalProfit / settled) * 100 : 0;
    return { total, won, lost, roi };
  }

  /**
   * Enrich coupon fixtures with latest match details (scores, date, status) from Fixture repo.
   */
  async mapWithFixtureDetails(coupons: SmartCoupon[]): Promise<SmartCoupon[]> {
    if (coupons.length === 0) return [];

    const fixtureIds = new Set<number>();
    coupons.forEach((c) => {
      if (Array.isArray(c.fixtures)) {
        c.fixtures.forEach((f) => fixtureIds.add(f.fixtureId));
      }
    });

    if (fixtureIds.size === 0) return coupons;

    const fixtures = await this.fixtureRepo.find({
      where: { id: In([...fixtureIds]) },
      select: ['id', 'matchDate', 'homeScore', 'awayScore', 'status'],
    });

    const fixtureMap = new Map(fixtures.map((f) => [f.id, f]));

    return coupons.map((c) => {
      const enrichedFixtures = c.fixtures.map((cf) => {
        const live = fixtureMap.get(cf.fixtureId);
        if (live) {
          return {
            ...cf,
            matchDate: live.matchDate,
            homeScore: live.homeScore,
            awayScore: live.awayScore,
            status: live.status, // e.g. '1H', 'FT', 'NS'
          };
        }
        return cf;
      });
      return { ...c, fixtures: enrichedFixtures };
    });
  }
}
