import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between, DataSource } from 'typeorm';
import { Fixture } from '../fixtures/entities/fixture.entity';
import { FixtureOdd } from '../fixtures/entities/fixture-odd.entity';
import { SyncStatus } from '../fixtures/entities/sync-status.entity';
import { Tipster } from './entities/tipster.entity';
import { Prediction } from './entities/prediction.entity';
import { PredictionFixture } from './entities/prediction-fixture.entity';
import { AccumulatorTicket } from '../accumulators/entities/accumulator-ticket.entity';
import { AccumulatorPick } from '../accumulators/entities/accumulator-pick.entity';
import { AI_TIPSTERS, AiTipsterConfig, AiTipsterPersonality } from '../../config/ai-tipsters.config';
import {
  fixtureInvolvesBigSix,
  isLikelyEplBigSixTeam,
} from '../../config/epl-big-six.config';
import { leagueMatchesFocus } from '../../config/league-focus.util';
import { ApiPredictionsService, ApiFixturePredictions } from '../fixtures/api-predictions.service';
import { OddsSyncService } from '../fixtures/odds-sync.service';
import { PredictionMarketplaceSyncService } from './prediction-marketplace-sync.service';
import { engineOutcomeKeyFromOddsLine } from '../fixtures/odds-outcome-keys';

interface FixturePrediction {
  fixtureId: number;
  apiId: number;
  matchDate: Date;
  leagueName: string | null;
  leagueId: number | null;
  homeTeam: string;
  awayTeam: string;
  selectedOutcome: string;
  odds: number;
  probability: number;
  ev: number;
  /** true when probability came from API-Football predictions */
  fromApi?: boolean;
}

export interface TipsterPredictionResult {
  tipsterUsername: string;
  tipsterDisplayName: string;
  tipsterId: number;
  predictionTitle: string;
  combinedOdds: number;
  stakeUnits: number;
  confidenceLevel: string;
  fixtures: FixturePrediction[];
  source: 'api_football' | 'internal';
}

@Injectable()
export class PredictionEngineService {
  private readonly logger = new Logger(PredictionEngineService.name);

  constructor(
    @InjectRepository(Fixture)
    private fixtureRepo: Repository<Fixture>,
    @InjectRepository(FixtureOdd)
    private oddsRepo: Repository<FixtureOdd>,
    @InjectRepository(SyncStatus)
    private syncStatusRepo: Repository<SyncStatus>,
    @InjectRepository(Tipster)
    private tipsterRepo: Repository<Tipster>,
    @InjectRepository(Prediction)
    private predictionRepo: Repository<Prediction>,
    @InjectRepository(PredictionFixture)
    private predictionFixtureRepo: Repository<PredictionFixture>,
    @InjectRepository(AccumulatorTicket)
    private ticketRepo: Repository<AccumulatorTicket>,
    @InjectRepository(AccumulatorPick)
    private pickRepo: Repository<AccumulatorPick>,
    private apiPredictionsService: ApiPredictionsService,
    private oddsSyncService: OddsSyncService,
    private dataSource: DataSource,
    private marketplaceSync: PredictionMarketplaceSyncService,
  ) { }

  /**
   * Returns count of predictions for today (used by scheduler for catch-up logic).
   */
  async getTodaysPredictionCount(): Promise<number> {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    return this.predictionRepo.count({
      where: {
        predictionDate: Between(start, end),
      },
    });
  }

  /**
   * Fixture IDs already used by any AI tipster on marketplace for the given date range.
   * Used to avoid assigning the same fixture to another tipster on re-runs (catch-up or manual).
   */
  private async getAlreadyUsedFixtureIdsForDate(startOfDay: Date, endOfDay: Date): Promise<Set<number>> {
    const aiTipsters = await this.tipsterRepo.find({
      where: { isAi: true },
      select: ['userId'],
    });
    const userIds = aiTipsters.map((t) => t.userId).filter((id): id is number => id != null);
    if (userIds.length === 0) return new Set();

    const tickets = await this.ticketRepo.find({
      where: {
        userId: In(userIds),
        isMarketplace: true,
        createdAt: Between(startOfDay, endOfDay),
      },
      select: ['id'],
    });
    const ticketIds = tickets.map((t) => t.id);
    if (ticketIds.length === 0) return new Set();

    const picks = await this.pickRepo.find({
      where: { accumulatorId: In(ticketIds) },
      select: ['fixtureId'],
    });
    const set = new Set<number>();
    for (const p of picks) {
      if (p.fixtureId != null) set.add(p.fixtureId);
    }
    return set;
  }

  /**
   * Main entry: generate predictions for all 25 AI tipsters (Hybrid: API-Football + value filter).
   * Fixtures are limited to the given calendar day (kickoff on that date in UTC window).
   * @param forDate Optional date (YYYY-MM-DD) for prediction_date; defaults to today
   */
  async generateDailyPredictionsForAllTipsters(forDate?: string, dryRun = false): Promise<TipsterPredictionResult[]> {
    const startTime = Date.now();
    const dateStr = forDate || new Date().toISOString().slice(0, 10);
    const startOfDay = new Date(dateStr + 'T00:00:00.000Z');
    const endOfDay = new Date(dateStr + 'T23:59:59.999Z');
    let apiRequestsUsed = 0;

    // 1. Get fixtures for target day only (no advance/future coupons)
    const allFixtures = await this.fixtureRepo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.odds', 'o')
      .where("f.status IN ('NS', 'TBD')")
      .andWhere('f.match_date >= :startOfDay', { startOfDay })
      .andWhere('f.match_date <= :endOfDay', { endOfDay })
      .orderBy('f.match_date', 'ASC')
      .getMany();

    // 2. Sync odds for fixtures without them (max 30). Skip if a global odds job is running.
    const withoutOdds = allFixtures.filter((f) => !f.odds || f.odds.length === 0);
    if (withoutOdds.length > 0) {
      const oddsRow = await this.syncStatusRepo.findOne({
        where: { syncType: 'odds' },
        select: ['status'],
      });
      if (oddsRow?.status === 'running') {
        this.logger.debug('Skipping same-day odds prefetch (global odds sync in progress)');
      } else {
        const toSync = withoutOdds.slice(0, 30).map((f) => f.id);
        const oddsResult = await this.oddsSyncService.syncOddsForFixtures(toSync);
        this.logger.log(`Synced odds for ${oddsResult.synced} fixtures`);
      }
    }

    // 3. Re-fetch fixtures with odds (same day only)
    const fixturesWithOdds = await this.fixtureRepo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.odds', 'o')
      .where("f.status IN ('NS', 'TBD')")
      .andWhere('f.match_date >= :startOfDay', { startOfDay })
      .andWhere('f.match_date <= :endOfDay', { endOfDay })
      .orderBy('f.match_date', 'ASC')
      .getMany();

    const withOdds = fixturesWithOdds.filter((f) => f.odds && f.odds.length > 0);
    this.logger.log(`Found ${withOdds.length} fixtures with odds for ${dateStr} (same-day only)`);

    if (withOdds.length < 1) {
      this.logger.warn('No fixtures with odds for this day');
      await this.logGeneration(forDate, 'failed', 0, withOdds.length, apiRequestsUsed, 'No fixtures with odds for target day', startTime);
      return [];
    }

    // 4. Fetch API-Football predictions (hybrid mode)
    const apiPredictionsMap = await this.apiPredictionsService.getPredictionsForFixtures(
      withOdds.map((f) => ({ id: f.id, apiId: f.apiId })),
      150,
    );
    apiRequestsUsed = apiPredictionsMap.size;
    this.logger.log(`Fetched API predictions for ${apiPredictionsMap.size}/${withOdds.length} fixtures`);

    // 5. Generate fixture-level predictions (hybrid: API prob when available, else implied)
    const fixturePredictions = await this.generateFixturePredictionsHybrid(withOdds, apiPredictionsMap);
    this.logger.log(`Generated predictions for ${fixturePredictions.length} fixtures`);

    // 6. For each tipster, create single-fixture coupons only (up to max_daily_predictions).
    // Global usedFixtureIds: once a fixture is used by any tipster, no other tipster can use it (avoids duplicate fixture+market across AI tipsters).
    // Seed from existing marketplace coupons for this date so re-runs (e.g. catch-up or manual) do not assign the same fixture to another tipster.
    const allPredictions: TipsterPredictionResult[] = [];
    const tipsterByUsername = new Map<string, Tipster>();
    const dbTipsters = await this.tipsterRepo.find({ where: { isAi: true } });
    for (const t of dbTipsters) tipsterByUsername.set(t.username, t);
    const usedFixtureIds = await this.getAlreadyUsedFixtureIdsForDate(startOfDay, endOfDay);
    if (usedFixtureIds.size > 0) {
      this.logger.log(`Seeded usedFixtureIds with ${usedFixtureIds.size} fixture(s) already on marketplace for ${dateStr}`);
    }

    let adminAiMaxPerDay = 2;
    try {
      // Raw SQL: avoids TypeORM find({ select }) without primary key (can throw) and missing-column errors pre-migration.
      const rows = (await this.dataSource.query(
        `SELECT ai_max_coupons_per_day AS v FROM api_settings WHERE id = 1 LIMIT 1`,
      )) as Array<{ v: number | string | null }>;
      const raw = rows?.[0]?.v != null ? Math.floor(Number(rows[0].v)) : 2;
      adminAiMaxPerDay = Number.isFinite(raw) && raw >= 1 ? Math.min(50, raw) : 2;
    } catch (e) {
      this.logger.warn(`ai_max_coupons_per_day unreadable (${(e as Error)?.message}); using default 2`);
      adminAiMaxPerDay = 2;
    }
    this.logger.log(`AI daily pick cap (admin): ${adminAiMaxPerDay} per tipster (UTC day)`);

    for (const tipsterConfig of AI_TIPSTERS) {
      if (!this.shouldTipsterPostToday(tipsterConfig)) continue;

      const tipster = tipsterByUsername.get(tipsterConfig.username);
      if (!tipster) continue;

      const configMax = tipsterConfig.personality.max_daily_predictions ?? 3;
      const maxForTipster = Math.min(configMax, adminAiMaxPerDay);
      let pred = this.createTipsterPrediction(tipsterConfig, tipster.id, fixturePredictions, usedFixtureIds);
      let count = 0;
      while (pred && count < maxForTipster) {
        allPredictions.push(pred);
        count++;
        pred.fixtures.forEach((f) => usedFixtureIds.add(f.fixtureId));
        pred = this.createTipsterPrediction(tipsterConfig, tipster.id, fixturePredictions, usedFixtureIds);
      }
    }

    // 7. Save to database (skip when dryRun)
    const predictionDate = forDate || new Date().toISOString().slice(0, 10);
    if (!dryRun) {
      await this.savePredictionsToDatabase(allPredictions, predictionDate);
    } else {
      this.logger.log(`[DRY RUN] Would save ${allPredictions.length} predictions (skipped).`);
    }

    const status = allPredictions.length > 0 ? 'success' : 'partial';
    await this.logGeneration(forDate, status, allPredictions.length, withOdds.length, apiRequestsUsed, null, startTime);

    return allPredictions;
  }

  private async logGeneration(
    forDate: string | undefined,
    status: string,
    predictionsGenerated: number,
    fixturesAnalyzed: number,
    apiRequestsUsed: number,
    errors: string | null,
    startTime: number,
  ): Promise<void> {
    try {
      const logDate = forDate || new Date().toISOString().slice(0, 10);
      const executionTime = Math.round((Date.now() - startTime) / 1000);
      await this.dataSource.query(
        `INSERT INTO generation_logs (log_date, status, predictions_generated, fixtures_analyzed, api_requests_used, errors, execution_time_seconds, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'hybrid')`,
        [logDate, status, predictionsGenerated, fixturesAnalyzed, apiRequestsUsed, errors, executionTime],
      );
    } catch (e) {
      this.logger.warn('Failed to write generation_logs', e);
    }
  }

  /**
   * Simplified probability model: implied prob from odds + small edge
   * EV = (our_prob * odds) - 1
   */
  private impliedProbToOurProb(odds: number, edge = 0.02): number {
    const implied = 1 / odds;
    return Math.min(0.95, implied + edge);
  }

  private calculateEv(prob: number, odds: number): number {
    return prob * odds - 1;
  }

  /**
   * Hybrid: use API-Football probability when available, else implied prob from odds.
   */
  private async generateFixturePredictionsHybrid(
    fixtures: Fixture[],
    apiPredictionsMap: Map<number, ApiFixturePredictions>,
  ): Promise<FixturePrediction[]> {
    const results: FixturePrediction[] = [];

    for (const fixture of fixtures) {
      const odds = fixture.odds || [];
      if (odds.length === 0) continue;

      const leagueName = fixture.leagueName || (fixture.league as any)?.name || null;
      const leagueId = fixture.leagueId ?? (fixture.league as any)?.id ?? null;
      const apiPred = apiPredictionsMap.get(fixture.id);

      const candidates: { outcome: string; odds: number; prob: number; ev: number; fromApi: boolean }[] = [];

      for (const o of odds) {
        const outcome = engineOutcomeKeyFromOddsLine(o.marketName, o.marketValue);
        if (!outcome || outcome === 'correct_score') continue;

        const oddsNum = Number(o.odds);
        if (oddsNum < 1.01) continue;

        const outcomeNorm = outcome.toLowerCase();
        let prob: number;
        let fromApi = false;

        if (apiPred?.outcomes) {
          const apiOutcome = apiPred.outcomes.find(
            (a) =>
              a.outcome === outcomeNorm ||
              (outcomeNorm === 'over25' && a.outcome === 'over25') ||
              (outcomeNorm === 'under25' && a.outcome === 'under25'),
          );
          if (!apiOutcome && outcomeNorm === 'home_away') {
            const home = apiPred.outcomes.find((a) => a.outcome === 'home');
            const away = apiPred.outcomes.find((a) => a.outcome === 'away');
            if (home && away) {
              prob = home.probability + away.probability;
              fromApi = true;
            } else {
              prob = this.impliedProbToOurProb(oddsNum);
            }
          } else if (
            !apiOutcome &&
            (outcomeNorm === 'dnb_home' || outcomeNorm === 'dnb_away')
          ) {
            const home = apiPred.outcomes.find((a) => a.outcome === 'home');
            const away = apiPred.outcomes.find((a) => a.outcome === 'away');
            const s = home && away ? home.probability + away.probability : 0;
            if (home && away && s > 0) {
              prob =
                outcomeNorm === 'dnb_home'
                  ? home.probability / s
                  : away.probability / s;
              fromApi = true;
            } else {
              prob = this.impliedProbToOurProb(oddsNum);
            }
          } else if (apiOutcome) {
            prob = apiOutcome.probability;
            fromApi = true;
          } else {
            prob = this.impliedProbToOurProb(oddsNum);
          }
        } else {
          prob = this.impliedProbToOurProb(oddsNum);
        }

        const ev = this.calculateEv(prob, oddsNum);
        candidates.push({
          outcome: outcomeNorm,
          odds: oddsNum,
          prob,
          ev,
          fromApi,
        });
      }

      if (candidates.length === 0) continue;

      /** One row per outcome type per fixture (best EV in that market) so specialists see their market. */
      const EMIT_OUTCOMES = [
        'home',
        'away',
        'draw',
        'over15',
        'under15',
        'over25',
        'under25',
        'over35',
        'under35',
        'btts',
        'home_away',
        'home_draw',
        'draw_away',
        'dnb_home',
        'dnb_away',
        'ht_home',
        'ht_away',
        'ht_draw',
        'fh_over05',
        'fh_under05',
        'fh_over15',
        'fh_under15',
        'fh_over25',
        'fh_under25',
        'odd_goals',
        'even_goals',
      ] as const;

      for (const outcomeKey of EMIT_OUTCOMES) {
        const group = candidates.filter((c) => c.outcome === outcomeKey);
        if (group.length === 0) continue;
        const best = [...group].sort((a, b) => b.ev - a.ev)[0];
        if (!best) continue;
        results.push({
          fixtureId: fixture.id,
          apiId: fixture.apiId,
          matchDate: fixture.matchDate,
          leagueName,
          leagueId,
          homeTeam: fixture.homeTeamName,
          awayTeam: fixture.awayTeamName,
          selectedOutcome: best.outcome,
          odds: best.odds,
          probability: best.prob,
          ev: best.ev,
          fromApi: best.fromApi,
        });
      }
    }

    return results;
  }

  /** Weekend = Sat(6), Sun(0). Midweek = Tue(2), Wed(3), Thu(4). */
  private matchesFixtureDays(matchDate: Date, fixtureDays?: 'weekend' | 'midweek'): boolean {
    if (!fixtureDays) return true;
    const d = new Date(matchDate).getDay();
    if (fixtureDays === 'weekend') return d === 0 || d === 6;
    if (fixtureDays === 'midweek') return d >= 2 && d <= 4;
    return true;
  }

  /**
   * team_filter top_6: home specialist → home club must be Big 6; away → away club;
   * otherwise either side Big 6.
   */
  private matchesTeamFilter(fp: FixturePrediction, personality: AiTipsterPersonality): boolean {
    const filters = personality.team_filter;
    if (!filters?.length) return true;
    const spec = personality.outcome_specialization;
    for (const f of filters) {
      if (f.toLowerCase() !== 'top_6') continue;
      if (spec === 'home') {
        if (!isLikelyEplBigSixTeam(fp.homeTeam)) return false;
      } else if (spec === 'away') {
        if (!isLikelyEplBigSixTeam(fp.awayTeam)) return false;
      } else if (!fixtureInvolvesBigSix(fp.homeTeam, fp.awayTeam)) {
        return false;
      }
      return true;
    }
    return true;
  }

  private filterByPersonality(
    fixturePredictions: FixturePrediction[],
    personality: AiTipsterPersonality,
  ): FixturePrediction[] {
    const leagues = personality.leagues_focus || [];
    const hasAll = leagues.some((l) => l.toLowerCase() === 'all');
    // When API data available, use min_api_confidence (or 0.52 fallback); else min_win_probability
    const minConf = personality.min_api_confidence ?? Math.min(0.52, personality.min_win_probability);
    const minProb = personality.min_win_probability;
    const evMin = Math.max(0, personality.min_expected_value - 0.08); // Relax so more tipsters see same value pool as Gambler

    return fixturePredictions.filter((fp) => {
      if (!this.matchesFixtureDays(fp.matchDate, personality.fixture_days)) return false;

      if (!hasAll && leagues.length > 0) {
        if (!fp.leagueName) return false;
        const match = leagues.some((l) => leagueMatchesFocus(fp.leagueName, l));
        if (!match) return false;
      }

      if (!this.matchesTeamFilter(fp, personality)) return false;

      if (fp.odds < personality.target_odds_min || fp.odds > personality.target_odds_max)
        return false;
      if (fp.fromApi) {
        if (fp.probability < minConf) return false;
      } else {
        if (fp.probability < minProb) return false;
      }
      if (fp.ev < evMin) return false;

      if (personality.selection_filter === 'home_only' && fp.selectedOutcome !== 'home')
        return false;
      if (personality.preference === 'underdogs') {
        if (fp.selectedOutcome !== 'away' || fp.odds < 2.5) return false;
      }

      const outcomeNorm = fp.selectedOutcome.toLowerCase();

      if (personality.outcome_specialization) {
        return outcomeNorm === personality.outcome_specialization;
      }

      const betTypes = personality.bet_types || [];
      const allows1x2 = betTypes.some((b) => b.toLowerCase().includes('1x2'));
      const allowsBtts = betTypes.some((b) => b.toLowerCase().includes('btts'));
      const allowsOver25 = betTypes.some((b) => b.toLowerCase().includes('over'));
      const allowsUnder25 = betTypes.some((b) => b.toLowerCase().includes('under'));
      const allowsDoubleChance = betTypes.some((b) => b.toLowerCase().includes('double'));
      const allowsDnb = betTypes.some((b) => {
        const x = b.toLowerCase();
        return x.includes('dnb') || x.includes('draw no bet');
      });
      const allowsFirstHalf = betTypes.some((b) => {
        const x = b.toLowerCase();
        return (
          x.includes('first half') ||
          x.includes('1st half') ||
          x.includes('half time') ||
          x === 'ht'
        );
      });
      const normOu = (s: string) => s.toLowerCase().replace(/\s+/g, '');
      const hasOverUnderCombo = betTypes.some((b) => normOu(b) === 'over/under');
      const allowsOver15 =
        allowsOver25 ||
        hasOverUnderCombo ||
        betTypes.some((b) => /over.*1\.5|1\.5.*over|o\s*1\.5/i.test(b));
      const allowsOver35 =
        allowsOver25 ||
        hasOverUnderCombo ||
        betTypes.some((b) => /over.*3\.5|3\.5.*over/i.test(b));
      const allowsUnder15 =
        betTypes.some((b) => /under.*1\.5|1\.5.*under|u\s*1\.5/i.test(b)) || hasOverUnderCombo;
      const allowsUnder35 =
        betTypes.some((b) => /under.*3\.5|3\.5.*under/i.test(b)) || hasOverUnderCombo;
      const allowsOddEven = betTypes.some((b) => {
        const x = b.toLowerCase();
        return x.includes('odd/even') || x.includes('odd even') || (x.includes('odd') && x.includes('even'));
      });

      if (['home', 'away'].includes(outcomeNorm) && !allows1x2) return false;
      if (outcomeNorm === 'draw' && !allows1x2) return false;
      if (outcomeNorm === 'btts' && !allowsBtts) return false;
      if (outcomeNorm === 'over15' && !allowsOver15) return false;
      if (outcomeNorm === 'over25' && !allowsOver25) return false;
      if (outcomeNorm === 'over35' && !allowsOver35) return false;
      if (outcomeNorm === 'under15' && !allowsUnder15) return false;
      if (outcomeNorm === 'under25' && !allowsUnder25) return false;
      if (outcomeNorm === 'under35' && !allowsUnder35) return false;
      if (
        ['home_away', 'home_draw', 'draw_away'].includes(outcomeNorm) &&
        !allowsDoubleChance
      )
        return false;
      if (['dnb_home', 'dnb_away'].includes(outcomeNorm) && !allowsDnb) return false;
      if (['ht_home', 'ht_away', 'ht_draw'].includes(outcomeNorm) && !allowsFirstHalf)
        return false;
      if (
        [
          'fh_over05',
          'fh_under05',
          'fh_over15',
          'fh_under15',
          'fh_over25',
          'fh_under25',
        ].includes(outcomeNorm) &&
        !allowsFirstHalf
      )
        return false;
      if (['odd_goals', 'even_goals'].includes(outcomeNorm) && !allowsOddEven) return false;

      return true;
    });
  }

  /**
   * AI coupons are single-fixture only. Picks the best suitable fixture by EV.
   */
  private createTipsterPrediction(
    tipsterConfig: AiTipsterConfig,
    tipsterId: number,
    fixturePredictions: FixturePrediction[],
    excludeFixtureIds: Set<number> = new Set(),
  ): TipsterPredictionResult | null {
    const personality = tipsterConfig.personality;
    const available = fixturePredictions.filter((fp) => !excludeFixtureIds.has(fp.fixtureId));
    const suitable = this.filterByPersonality(available, personality);
    if (suitable.length === 0) {
      this.logger.debug(`${tipsterConfig.username}: 0 suitable → no prediction`);
      return null;
    }
    const best = [...suitable].sort((a, b) => b.ev - a.ev)[0];
    const confidenceLevel = this.getConfidenceLevel(best.probability);
    const stakeUnits = this.calculateKellyStake(best.probability, best.odds);
    const source = best.fromApi ? 'api_football' : 'internal';
    this.logger.debug(`${tipsterConfig.username}: ${suitable.length} suitable → single pick`);
    return {
      tipsterUsername: tipsterConfig.username,
      tipsterDisplayName: tipsterConfig.display_name,
      tipsterId,
      predictionTitle: `${best.homeTeam} vs ${best.awayTeam}`,
      combinedOdds: best.odds,
      stakeUnits,
      confidenceLevel,
      fixtures: [best],
      source,
    };
  }

  private shouldTipsterPostToday(_tipsterConfig: AiTipsterConfig): boolean {
    // All tipsters post when fixtures meet criteria. Value filters in createTipsterPrediction
    // determine whether a qualifying acca exists; if not, no prediction is saved.
    return true;
  }

  private getConfidenceLevel(prob: number): string {
    if (prob >= 0.7) return 'max';
    if (prob >= 0.6) return 'high';
    if (prob >= 0.5) return 'medium';
    return 'low';
  }

  private calculateKellyStake(prob: number, odds: number, fraction = 0.25): number {
    const b = odds - 1;
    const q = 1 - prob;
    const kelly = (b * prob - q) / b;
    if (kelly <= 0) return 0.5;
    const stake = Math.min(2, Math.max(0.5, 1 + kelly * fraction));
    return Math.round(stake * 10) / 10;
  }

  private async savePredictionsToDatabase(
    predictions: TipsterPredictionResult[],
    predictionDate: string,
  ): Promise<void> {

    for (const pred of predictions) {
      // AI coupons are single-fixture only
      const prediction = await this.predictionRepo.save({
        tipsterId: pred.tipsterId,
        predictionTitle: 'Single',
        combinedOdds: pred.combinedOdds,
        stakeUnits: pred.stakeUnits,
        confidenceLevel: pred.confidenceLevel,
        status: 'pending',
        predictionDate,
        source: pred.source,
      });

      for (let i = 0; i < pred.fixtures.length; i++) {
        const leg = pred.fixtures[i];
        await this.predictionFixtureRepo.save({
          predictionId: prediction.id,
          fixtureId: leg.fixtureId,
          matchDate: leg.matchDate,
          leagueName: leg.leagueName,
          leagueId: leg.leagueId,
          homeTeam: leg.homeTeam,
          awayTeam: leg.awayTeam,
          selectedOutcome: leg.selectedOutcome,
          selectionOdds: leg.odds,
          resultStatus: 'pending',
          aiProbability: leg.probability,
          expectedValue: leg.ev,
          legNumber: i + 1,
        });
      }

      const tipster = await this.tipsterRepo.findOne({ where: { id: pred.tipsterId } });
      if (tipster) {
        tipster.totalPredictions = (tipster.totalPredictions || 0) + 1;
        tipster.lastPredictionDate = new Date();
        await this.tipsterRepo.save(tipster);
      }

      const fixtures = await this.predictionFixtureRepo.find({
        where: { predictionId: prediction.id },
        order: { legNumber: 'ASC' },
      });
      if (tipster) {
        await this.marketplaceSync.syncToMarketplace(prediction, fixtures, tipster);
      }
    }
  }

  /**
   * Manual trigger (e.g. from admin)
   * @param date Optional date (YYYY-MM-DD) for prediction_date
   */
  async runNow(date?: string): Promise<{ count: number; message: string }> {
    const result = await this.generateDailyPredictionsForAllTipsters(date);
    return {
      count: result.length,
      message: `Generated ${result.length} predictions for AI tipsters`,
    };
  }
}
