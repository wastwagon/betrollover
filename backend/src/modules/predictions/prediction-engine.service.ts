import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between, DataSource } from 'typeorm';
import { Fixture } from '../fixtures/entities/fixture.entity';
import { FixtureOdd } from '../fixtures/entities/fixture-odd.entity';
import { Tipster } from './entities/tipster.entity';
import { Prediction } from './entities/prediction.entity';
import { PredictionFixture } from './entities/prediction-fixture.entity';
import { AI_TIPSTERS, AiTipsterConfig, AiTipsterPersonality } from '../../config/ai-tipsters.config';
import { ApiPredictionsService, ApiFixturePredictions } from '../fixtures/api-predictions.service';
import { OddsSyncService } from '../fixtures/odds-sync.service';
import { PredictionMarketplaceSyncService } from './prediction-marketplace-sync.service';

/** Maps market value to outcome key for filtering. Draw is excluded per user preference. */
function outcomeFromMarket(marketName: string, marketValue: string): string {
  const v = (marketValue || '').trim().toLowerCase();
  if (marketName === 'Match Winner') {
    if (v.includes('home') || v === '1') return 'home';
    if (v.includes('away') || v === '2') return 'away';
    if (v.includes('draw') || v === 'x') return 'draw'; // kept for filtering out
  }
  if (marketName === 'Both Teams To Score') {
    if (v.includes('yes')) return 'btts';
  }
  if (marketName === 'Goals Over/Under') {
    if (v.includes('over') && v.includes('2.5')) return 'over25';
    if (v.includes('under') && v.includes('2.5')) return 'under25';
  }
  if (marketName === 'Double Chance') {
    if (v.includes('home') && v.includes('away') || v === '12') return 'home_away';
    if (v.includes('home') && v.includes('draw') || v === '1x') return 'home_draw';
    if (v.includes('draw') && v.includes('away') || v === 'x2') return 'draw_away';
  }
  if (marketName === 'Correct Score') return 'correct_score';
  return v;
}

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

interface TipsterPredictionResult {
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
    @InjectRepository(Tipster)
    private tipsterRepo: Repository<Tipster>,
    @InjectRepository(Prediction)
    private predictionRepo: Repository<Prediction>,
    @InjectRepository(PredictionFixture)
    private predictionFixtureRepo: Repository<PredictionFixture>,
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
   * Main entry: generate predictions for all 25 AI tipsters (Hybrid: API-Football + value filter)
   * Fixtures are drawn from the next 7 days (not limited to a single day). Value filters determine qualifying accas.
   * @param forDate Optional date (YYYY-MM-DD) for prediction_date; defaults to today
   */
  async generateDailyPredictionsForAllTipsters(forDate?: string): Promise<TipsterPredictionResult[]> {
    const startTime = Date.now();
    const refDate = forDate ? new Date(forDate + 'T12:00:00Z') : new Date();
    const now = refDate;
    const sevenDaysLater = new Date(refDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    let apiRequestsUsed = 0;

    // 1. Get upcoming fixtures (next 7 days)
    const allFixtures = await this.fixtureRepo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.odds', 'o')
      .where("f.status IN ('NS', 'TBD')")
      .andWhere('f.match_date >= :now', { now })
      .andWhere('f.match_date <= :end', { end: sevenDaysLater })
      .orderBy('f.match_date', 'ASC')
      .getMany();

    // 2. Sync odds for fixtures without them (max 30, for manual runs)
    const withoutOdds = allFixtures.filter((f) => !f.odds || f.odds.length === 0);
    if (withoutOdds.length > 0) {
      const toSync = withoutOdds.slice(0, 30).map((f) => f.id);
      const oddsResult = await this.oddsSyncService.syncOddsForFixtures(toSync);
      this.logger.log(`Synced odds for ${oddsResult.synced} fixtures`);
    }

    // 3. Re-fetch fixtures with odds
    const fixturesWithOdds = await this.fixtureRepo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.odds', 'o')
      .where("f.status IN ('NS', 'TBD')")
      .andWhere('f.match_date >= :now', { now })
      .andWhere('f.match_date <= :end', { end: sevenDaysLater })
      .orderBy('f.match_date', 'ASC')
      .getMany();

    const withOdds = fixturesWithOdds.filter((f) => f.odds && f.odds.length > 0);
    this.logger.log(`Found ${withOdds.length} upcoming fixtures with odds`);

    if (withOdds.length < 2) {
      this.logger.warn('Not enough fixtures with odds to generate predictions');
      await this.logGeneration(forDate, 'failed', 0, withOdds.length, apiRequestsUsed, 'Not enough fixtures with odds', startTime);
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

    // 6. For each tipster, create multiple 2-fixture accas (no max cap; no fixture repeat)
    const allPredictions: TipsterPredictionResult[] = [];
    const tipsterByUsername = new Map<string, Tipster>();
    const dbTipsters = await this.tipsterRepo.find({ where: { isAi: true } });
    for (const t of dbTipsters) tipsterByUsername.set(t.username, t);

    for (const tipsterConfig of AI_TIPSTERS) {
      if (!this.shouldTipsterPostToday(tipsterConfig)) continue;

      const tipster = tipsterByUsername.get(tipsterConfig.username);
      if (!tipster) continue;

      const usedFixtureIds = new Set<number>();
      const maxForTipster = tipsterConfig.personality.max_daily_predictions ?? 999;
      let pred = this.createTipsterPrediction(tipsterConfig, tipster.id, fixturePredictions, usedFixtureIds);
      let count = 0;
      while (pred && count < maxForTipster) {
        allPredictions.push(pred);
        count++;
        pred.fixtures.forEach((f) => usedFixtureIds.add(f.fixtureId));
        pred = this.createTipsterPrediction(tipsterConfig, tipster.id, fixturePredictions, usedFixtureIds);
      }
    }

    // 7. Save to database
    const predictionDate = forDate || new Date().toISOString().slice(0, 10);
    await this.savePredictionsToDatabase(allPredictions, predictionDate);

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
        const outcome = outcomeFromMarket(o.marketName, o.marketValue);
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

      // Exclude draw: only home, away, btts, over25, under25, home_away (Double Chance 12)
      const NO_DRAW_OUTCOMES = ['home', 'away', 'btts', 'over25', 'under25', 'home_away'];
      const nonDrawCandidates = candidates.filter((c) => NO_DRAW_OUTCOMES.includes(c.outcome));
      const sorted = (nonDrawCandidates.length > 0 ? nonDrawCandidates : candidates)
        .filter((c) => c.outcome !== 'draw')
        .sort((a, b) => b.ev - a.ev);
      const best = sorted[0];
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

    return results;
  }

  /** Aliases for league matching: config key (lowercase) -> possible API/DB names (lowercase, no spaces for fuzzy match). */
  private static readonly LEAGUE_ALIASES: Record<string, string[]> = {
    'premier league': ['premier league', 'english premier league', 'epl'],
    'la liga': ['la liga', 'laliga', 'spanish la liga', 'laliga santander'],
    'serie a': ['serie a', 'italian serie a', 'serie a tim'],
    'bundesliga': ['bundesliga', 'german bundesliga', 'bundesliga 1'],
    'ligue 1': ['ligue 1', 'france ligue 1', 'ligue 1 ubereats'],
    championship: ['championship', 'english championship', 'efl championship', 'championship league'],
  };

  /** League name matches config focus: includes, normalized (no spaces), or explicit aliases. */
  private leagueMatchesFocus(fixtureLeagueName: string | null, configLeague: string): boolean {
    if (!fixtureLeagueName) return false;
    const f = fixtureLeagueName.toLowerCase().trim();
    const c = configLeague.toLowerCase().trim();
    if (f.includes(c)) return true;
    const fNorm = f.replace(/\s+/g, '');
    const cNorm = c.replace(/\s+/g, '');
    if (fNorm.includes(cNorm) || cNorm.includes(fNorm)) return true;
    const aliases = PredictionEngineService.LEAGUE_ALIASES[cNorm] ?? [cNorm];
    return aliases.some((alias) => f.includes(alias) || fNorm.includes(alias.replace(/\s+/g, '')));
  }

  /** Weekend = Sat(6), Sun(0). Midweek = Tue(2), Wed(3), Thu(4). */
  private matchesFixtureDays(matchDate: Date, fixtureDays?: 'weekend' | 'midweek'): boolean {
    if (!fixtureDays) return true;
    const d = new Date(matchDate).getDay();
    if (fixtureDays === 'weekend') return d === 0 || d === 6;
    if (fixtureDays === 'midweek') return d >= 2 && d <= 4;
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
        const match = leagues.some((l) => this.leagueMatchesFocus(fp.leagueName, l));
        if (!match) return false;
      }

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
      const betTypes = personality.bet_types || [];
      const allows1x2 = betTypes.some((b) => b.toLowerCase().includes('1x2'));
      const allowsBtts = betTypes.some((b) => b.toLowerCase().includes('btts'));
      const allowsOver25 = betTypes.some((b) => b.toLowerCase().includes('over'));
      const allowsUnder25 = betTypes.some((b) => b.toLowerCase().includes('under'));
      const allowsDoubleChance = betTypes.some((b) => b.toLowerCase().includes('double'));

      if (['home', 'away'].includes(outcomeNorm) && !allows1x2) return false;
      if (outcomeNorm === 'draw') return false;
      if (outcomeNorm === 'btts' && !allowsBtts) return false;
      if (outcomeNorm === 'over25' && !allowsOver25) return false;
      if (outcomeNorm === 'under25' && !allowsUnder25) return false;
      if (outcomeNorm === 'home_away' && !allowsDoubleChance) return false;

      return true;
    });
  }

  /** Combined odds bounds for 2-fixture accas: 2.0 to 4.0 */
  private static readonly MIN_COMBINED_ODDS = 2;
  private static readonly MAX_COMBINED_ODDS = 4;

  private findBest2FixtureAcca(
    fixtures: FixturePrediction[],
    personality: AiTipsterPersonality,
  ): { leg1: FixturePrediction; leg2: FixturePrediction } | null {
    if (fixtures.length < 2) return null;

    let best: { leg1: FixturePrediction; leg2: FixturePrediction; score: number } | null =
      null;

    for (let i = 0; i < fixtures.length; i++) {
      for (let j = i + 1; j < fixtures.length; j++) {
        const leg1 = fixtures[i];
        const leg2 = fixtures[j];

        const combinedOdds = leg1.odds * leg2.odds;
        if (combinedOdds < PredictionEngineService.MIN_COMBINED_ODDS) continue;
        if (combinedOdds > PredictionEngineService.MAX_COMBINED_ODDS) continue;

        const accaMin = personality.target_odds_min * personality.target_odds_min;
        const accaMax = personality.target_odds_max * personality.target_odds_max;
        if (combinedOdds < accaMin || combinedOdds > accaMax) continue;

        const combinedProb = leg1.probability * leg2.probability;
        const score = leg1.ev * 10 + leg2.ev * 10 + combinedProb * 5;

        if (!best || score > best.score) {
          best = { leg1, leg2, score };
        }
      }
    }

    return best ? { leg1: best.leg1, leg2: best.leg2 } : null;
  }

  private createTipsterPrediction(
    tipsterConfig: AiTipsterConfig,
    tipsterId: number,
    fixturePredictions: FixturePrediction[],
    excludeFixtureIds: Set<number> = new Set(),
  ): TipsterPredictionResult | null {
    const personality = tipsterConfig.personality;
    const available = fixturePredictions.filter((fp) => !excludeFixtureIds.has(fp.fixtureId));
    const suitable = this.filterByPersonality(available, personality);
    const bestAcca = this.findBest2FixtureAcca(suitable, personality);
    this.logger.debug(
      `${tipsterConfig.username}: ${suitable.length} suitable → ${bestAcca ? 'coupon' : 'no acca in 2–4 odds'}`,
    );
    if (suitable.length < 2) return null;
    if (!bestAcca) return null;

    const { leg1, leg2 } = bestAcca;
    const combinedOdds = leg1.odds * leg2.odds;
    const combinedProb = leg1.probability * leg2.probability;
    const confidenceLevel = this.getConfidenceLevel(combinedProb);
    const stakeUnits = this.calculateKellyStake(combinedProb, combinedOdds);
    const source = leg1.fromApi && leg2.fromApi ? 'api_football' : 'internal';

    return {
      tipsterUsername: tipsterConfig.username,
      tipsterDisplayName: tipsterConfig.display_name,
      tipsterId,
      predictionTitle: `${leg1.homeTeam} vs ${leg1.awayTeam} & ${leg2.homeTeam} vs ${leg2.awayTeam}`,
      combinedOdds,
      stakeUnits,
      confidenceLevel,
      fixtures: [leg1, leg2],
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
      const prediction = await this.predictionRepo.save({
        tipsterId: pred.tipsterId,
        predictionTitle: '2-Pick Acca',
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
