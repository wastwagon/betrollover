import { Injectable, Logger, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { FixtureUpdateService } from './fixture-update.service';
import { FootballSyncService } from './football-sync.service';
import { OddsSyncService } from './odds-sync.service';
import { VolleyballSyncService } from '../volleyball/volleyball-sync.service';
import { SettlementService } from '../accumulators/settlement.service';
import { PredictionEngineService } from '../predictions/prediction-engine.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Fixture } from './entities/fixture.entity';
import { FixtureArchive } from './entities/fixture-archive.entity';
import { SyncStatus } from './entities/sync-status.entity';
import { SYNC_LOOKAHEAD_DAYS } from '../../config/api-limits.config';
import { SyncLockService } from './sync-lock.service';

const PREDICTION_TIME_ZONE =
  process.env.PREDICTION_TIMEZONE || process.env.TIMEZONE || 'Africa/Accra';
const ODDS_FORCE_REFRESH_CRON = process.env.ODDS_FORCE_REFRESH_CRON || '45 19 * * *';
const PREDICTION_DAILY_CRON = process.env.PREDICTION_DAILY_CRON || '0 20 * * *';
const PREDICTION_CATCHUP_CRON = process.env.PREDICTION_CATCHUP_CRON || '0 2 * * *';

/**
 * Scheduled Jobs for Fixture Updates & Syncing
 *
 * Full fixture import (enabled leagues, lookahead window) runs every 6 hours (00:00, 06:00, 12:00, 18:00 server local time)
 * so newly published fixtures appear without waiting for a single daily run. ~28 API calls/day for dates — fine on Pro/Ultra.
 * Live + finished fixture sync about every minute (Ultra); periodic settlement every minute. Also: 19:45 odds force, 20:00 AI predictions, 2:00 AM catch-up + archive.
 *
 * Postgres / checkpoints: bursts of WAL and long `checkpoint complete` lines often align with this service — especially
 * the 6-hour full sync (fixtures + odds + cleanup), the 2-hour odds pass, ODDS_FORCE_REFRESH_CRON, and PREDICTION_DAILY_CRON.
 * Crons below without `{ timeZone }` use the process timezone (typically set TZ on the API container); prediction-related
 * env crons use PREDICTION_TIMEZONE. Misaligned TZ makes UTC log correlation harder.
 *
 * Set ENABLE_FOOTBALL_SYNC=false to skip football API (e.g. when using prod server).
 */
@Injectable()
export class FixtureSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(FixtureSchedulerService.name);

  constructor(
    private fixtureUpdateService: FixtureUpdateService,
    private footballSyncService: FootballSyncService,
    private oddsSyncService: OddsSyncService,
    private volleyballSyncService: VolleyballSyncService,
    @Inject(forwardRef(() => SettlementService))
    private settlementService: SettlementService,
    @Inject(forwardRef(() => PredictionEngineService))
    private predictionEngine: PredictionEngineService,
    @InjectRepository(Fixture)
    private fixtureRepo: Repository<Fixture>,
    @InjectRepository(FixtureArchive)
    private archiveRepo: Repository<FixtureArchive>,
    @InjectRepository(SyncStatus)
    private syncStatusRepo: Repository<SyncStatus>,
    private dataSource: DataSource,
    private configService: ConfigService,
    private syncLockService: SyncLockService,
  ) { }

  onModuleInit(): void {
    if (!this.isSchedulingEnabled()) {
      this.logger.warn(
        'ENABLE_SCHEDULING is not "true" — all fixture/odds cron jobs are OFF. ' +
          'Set ENABLE_SCHEDULING=true on the API host or you must use Admin → Sync Fixtures manually.',
      );
      return;
    }
    if (!this.isFootballSyncEnabled()) {
      this.logger.warn(
        'ENABLE_FOOTBALL_SYNC is false — automatic football fixture import is OFF. ' +
          'Set ENABLE_FOOTBALL_SYNC=true for scheduled imports.',
      );
    }
  }

  private isSchedulingEnabled(): boolean {
    const enabled = this.configService.get('ENABLE_SCHEDULING') === 'true';
    if (!enabled) {
      // this.logger.debug('Scheduling disabled (ENABLE_SCHEDULING != true), skipping task');
    }
    return enabled;
  }

  /** Skip football API sync when ENABLE_FOOTBALL_SYNC=false (e.g. avoid using credits in dev). */
  private isFootballSyncEnabled(): boolean {
    const v = this.configService.get('ENABLE_FOOTBALL_SYNC');
    if (v === 'false' || v === '0') return false;
    return true;
  }

  private async updateSyncStatus(
    syncType: string,
    status: string,
    count: number = 0,
    error: string | null = null,
    leagues?: number,
    due?: { missing: number; stale: number },
  ) {
    const payload: Record<string, unknown> = {
      syncType,
      status,
      lastSyncAt: status === 'success' ? new Date() : undefined,
      lastSyncCount: count,
      lastError: status === 'success' ? null : (error ?? null),
    };
    if (syncType === 'fixtures' && leagues != null) {
      payload.lastSyncLeagues = leagues;
    }
    // Only set when this run computed due breakdown; omit otherwise so upsert does not wipe prior values.
    if (syncType === 'odds' && due !== undefined) {
      payload.lastSyncDueMissing = due.missing;
      payload.lastSyncDueStale = due.stale;
    }
    await this.syncStatusRepo.upsert(payload as any, ['syncType']);
  }

  /** Small timing helper for cron observability in logs. */
  private async timedRun<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const startedAt = Date.now();
    try {
      return await fn();
    } finally {
      const elapsedMs = Date.now() - startedAt;
      this.logger.debug(`${label} completed in ${elapsedMs}ms`);
    }
  }

  /** Try to run settlement once; skip if another settlement run is already active. */
  private async runSettlementIfIdle(reason: string): Promise<void> {
    if (!(await this.syncLockService.tryStartSync('settlement'))) {
      this.logger.debug(`Settlement already running, skip trigger from ${reason}`);
      return;
    }
    try {
      const result = await this.timedRun(`settlement (${reason})`, async () =>
        this.settlementService.checkAndSettleAccumulators(),
      );
      await this.updateSyncStatus('settlement', 'success', result.ticketsSettled);
    } catch (error: any) {
      this.logger.error(`Error in settlement trigger (${reason})`, error);
      await this.updateSyncStatus('settlement', 'error', 0, error?.message ?? 'unknown error');
    }
  }

  /**
   * Update live fixtures every minute (Ultra-friendly; one /fixtures/live API call per run).
   * Skips if previous run still in progress.
   */
  @Cron('*/1 * * * *')
  async handleLiveFixtureUpdate() {
    if (!this.isSchedulingEnabled()) return;
    if (!(await this.syncLockService.tryStartSync('live'))) return;
    this.logger.debug('Running scheduled live fixture update...');
    try {
      const result = await this.timedRun('live fixture sync', async () =>
        this.fixtureUpdateService.updateLiveFixtures(),
      );
      if (result.updated > 0) {
        this.logger.log(`Updated ${result.updated} live fixtures`);
        await this.updateSyncStatus('live', 'success', result.updated);

        // Trigger settlement check for updated fixtures (guarded from overlap)
        await this.runSettlementIfIdle('live');
      } else {
        await this.updateSyncStatus('live', 'success', 0);
      }
    } catch (error: any) {
      this.logger.error('Error in scheduled live fixture update', error);
      await this.updateSyncStatus('live', 'error', 0, error.message);
    }
  }

  /**
   * Update finished fixtures every minute (pending picks first; batches API ids).
   * Skips if previous run still in progress.
   */
  @Cron('*/1 * * * *')
  async handleFinishedFixtureUpdate() {
    if (!this.isSchedulingEnabled()) return;
    if (!(await this.syncLockService.tryStartSync('finished'))) return;
    this.logger.debug('Running scheduled finished fixture update...');
    try {
      const result = await this.timedRun('finished fixture sync', async () =>
        this.fixtureUpdateService.updateFinishedFixtures(),
      );
      if (result.updated > 0) {
        this.logger.log(`Updated ${result.updated} finished fixtures`);
        await this.updateSyncStatus('finished', 'success', result.updated);

        // Trigger settlement check immediately after fixture updates (guarded from overlap)
        await this.runSettlementIfIdle('finished');
      } else {
        await this.updateSyncStatus('finished', 'success', 0);
      }
    } catch (error: any) {
      this.logger.error('Error in scheduled finished fixture update', error);
      await this.updateSyncStatus('finished', 'error', 0, error.message);
    }
  }

  /**
   * Full fixture import every 6 hours (00:00, 06:00, 12:00, 18:00 server local time).
   * Same work as manual "Sync Fixtures": next 7 UTC days, enabled leagues only, then odds pass inside FootballSyncService.sync().
   * Skipped when ENABLE_FOOTBALL_SYNC=false.
   */
  @Cron('0 */6 * * *')
  async handlePeriodicFullFixtureSync() {
    if (!this.isSchedulingEnabled()) return;
    if (!this.isFootballSyncEnabled()) {
      this.logger.debug('Football sync disabled (ENABLE_FOOTBALL_SYNC=false), skipping');
      return;
    }
    if (!(await this.syncLockService.tryStartSync('fixtures'))) {
      this.logger.warn('Fixture sync already running, skipping this tick');
      return;
    }
    this.logger.log('Running scheduled full fixture sync (7 days, enabled leagues)...');
    try {
      const result = await this.footballSyncService.sync();
      this.logger.log(
        `Scheduled fixture sync completed: ${result.fixtures} fixtures, ${result.leagues} leagues, odds pass ${result.odds ?? 0}`,
      );
      if (result.leagues > 0 && result.fixtures === 0) {
        this.logger.warn(
          'No fixtures synced despite enabled leagues. Check API key (Admin → API Settings) and API-Football status.',
        );
      }
      await this.updateSyncStatus('fixtures', 'success', result.fixtures, null, result.leagues);
      await this.updateSyncStatus('odds', 'success', result.odds ?? 0);
    } catch (error: any) {
      this.logger.error('Error in scheduled fixture sync', error);
      await this.updateSyncStatus('fixtures', 'error', 0, error.message);
    }
  }

  /**
   * Sync odds for upcoming fixtures (runs every 2 hours)
   * Pre-loads odds for fixtures up to lookahead window that are missing odds OR stale.
   * Prioritizes soonest matches. Uses Tier 1/2 market filter (BTTS, Correct Score, HT/FT).
   */
  @Cron('0 */2 * * *') // Every 2 hours
  async handleOddsSync() {
    if (!this.isSchedulingEnabled()) return;
    if (!(await this.syncLockService.tryStartSync('odds'))) {
      this.logger.debug('Odds sync already running, skipping');
      return;
    }
    this.logger.debug('Running scheduled odds sync for upcoming fixtures...');
    try {
      const now = new Date();
      const lookaheadEnd = new Date(now.getTime() + SYNC_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);
      const refreshBefore = new Date(now.getTime() - 6 * 60 * 60 * 1000);

      // Refresh fixtures with no odds rows OR stale odds snapshot.
      const due = await this.fixtureRepo
        .createQueryBuilder('f')
        .leftJoin('f.odds', 'o')
        .where("f.status IN ('NS', 'TBD')")
        .andWhere('f.match_date >= :now', { now })
        .andWhere('f.match_date <= :lookaheadEnd', { lookaheadEnd })
        .select('f.id', 'id')
        .addSelect('MAX(o.synced_at)', 'lastSyncedAt')
        .groupBy('f.id')
        .addGroupBy('f.match_date')
        .having('COUNT(o.id) = 0 OR MAX(o.synced_at) < :refreshBefore', { refreshBefore })
        .orderBy('f.match_date', 'ASC')
        .getRawMany<{ id: string; lastSyncedAt: string | null }>();

      const dueMissing = due.filter((r) => !r.lastSyncedAt).length;
      const dueStale = due.length - dueMissing;
      this.logger.debug(
        `Odds sync due fixtures: total=${due.length}, missing=${dueMissing}, stale=${dueStale}`,
      );

      if (due.length > 0) {
        const fixtureIds = due.map((r) => Number(r.id)).filter((id) => Number.isFinite(id));
        const result = await this.oddsSyncService.syncOddsForFixtures(fixtureIds);
        this.logger.log(
          `Odds sync completed: ${result.synced} fixtures synced (${fixtureIds.length} due; missing=${dueMissing}, stale=${dueStale}), ${result.errors} errors`
        );
        await this.updateSyncStatus('odds', 'success', result.synced, null, undefined, {
          missing: dueMissing,
          stale: dueStale,
        });
      } else {
        await this.updateSyncStatus('odds', 'success', 0, null, undefined, {
          missing: dueMissing,
          stale: dueStale,
        });
      }
      const removed = await this.footballSyncService.deleteUpcomingFixturesWithoutOdds();
      if (removed > 0) this.logger.log(`Cleaned up ${removed} upcoming fixture(s) without odds`);
    } catch (error: any) {
      this.logger.error('Error in scheduled odds sync', error);
      await this.updateSyncStatus('odds', 'error', 0, error.message);
    }
  }

  /**
   * Daily force refresh of odds (default 19:45 in PREDICTION_TIME_ZONE; before prediction run)
   * Re-syncs upcoming fixtures to apply latest Tier 1/2 market filter.
   */
  @Cron(ODDS_FORCE_REFRESH_CRON, { timeZone: PREDICTION_TIME_ZONE })
  async handleOddsForceRefresh() {
    if (!this.isSchedulingEnabled()) return;
    // Same lock as scheduled/manual odds sync — avoids parallel API + DB load.
    if (!(await this.syncLockService.tryStartSync('odds'))) {
      this.logger.debug('Odds force refresh skipped (another odds job holds the lock)');
      return;
    }
    this.logger.log('Running daily odds force refresh (BTTS, Correct Score, etc.)...');
    try {
      const now = new Date();
      const lookaheadEnd = new Date(now.getTime() + SYNC_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);

      const allFixtures = await this.fixtureRepo
        .createQueryBuilder('f')
        .where("f.status IN ('NS', 'TBD')")
        .andWhere('f.match_date >= :now', { now })
        .andWhere('f.match_date <= :lookaheadEnd', { lookaheadEnd })
        .orderBy('f.match_date', 'ASC')
        .getMany();

      const fixtureIds = allFixtures.map(f => f.id);

      let synced = 0;
      if (fixtureIds.length > 0) {
        const result = await this.oddsSyncService.syncOddsForFixtures(fixtureIds);
        synced = result.synced;
        this.logger.log(
          `Odds force refresh completed: ${result.synced} fixtures updated, ${result.errors} errors`
        );
      }
      const removed = await this.footballSyncService.deleteUpcomingFixturesWithoutOdds();
      if (removed > 0) this.logger.log(`Cleaned up ${removed} upcoming fixture(s) without odds`);
      await this.updateSyncStatus('odds', 'success', synced, null, undefined, {
        missing: 0,
        stale: fixtureIds.length,
      });
      await this.syncStatusRepo.upsert(
        {
          syncType: 'odds_refresh',
          status: 'success',
          lastSyncAt: new Date(),
          lastSyncCount: fixtureIds.length,
          lastError: null,
        },
        ['syncType'],
      );
    } catch (error: any) {
      this.logger.error('Error in odds force refresh', error);
      await this.updateSyncStatus('odds', 'error', 0, error.message);
      await this.syncStatusRepo.upsert(
        { syncType: 'odds_refresh', status: 'error', lastError: error.message },
        ['syncType'],
      );
    }
  }

  /**
   * Daily prediction generation (default 20:00 in PREDICTION_TIME_ZONE).
   * Generates AI tipster predictions for the current UTC calendar day.
   */
  @Cron(PREDICTION_DAILY_CRON, { timeZone: PREDICTION_TIME_ZONE })
  async handleDailyPredictionGeneration() {
    if (!this.isSchedulingEnabled()) return;
    if (!(await this.syncLockService.tryStartSync('predictions'))) {
      this.logger.warn('Prediction generation already running, skipping');
      return;
    }
    this.logger.log('Running scheduled daily prediction generation...');
    try {
      const result = await this.predictionEngine.generateDailyPredictionsForAllTipsters();
      this.logger.log(`Prediction generation completed: ${result.length} predictions`);
      await this.updateSyncStatus('predictions', 'success', result.length);
    } catch (error: any) {
      this.logger.error('Error in prediction generation', error);
      await this.updateSyncStatus('predictions', 'error', 0, error.message);
    }
  }

  /**
   * Catch-up: if no predictions exist by the catch-up cron (default 2 AM), run generation again.
   * Handles cases where the evening run failed or fixtures/odds were not ready.
   */
  @Cron(PREDICTION_CATCHUP_CRON, { timeZone: PREDICTION_TIME_ZONE })
  async handlePredictionCatchUp() {
    if (!this.isSchedulingEnabled()) return;
    const count = await this.predictionEngine.getTodaysPredictionCount();
    if (count > 0) {
      this.logger.debug(`Catch-up skipped: ${count} predictions already exist for today`);
      return;
    }
    if (!(await this.syncLockService.tryStartSync('predictions'))) {
      this.logger.warn('Prediction generation already running, skipping catch-up');
      return;
    }
    this.logger.log('Catch-up: no predictions for today, running generation...');
    try {
      const result = await this.predictionEngine.generateDailyPredictionsForAllTipsters();
      this.logger.log(`Catch-up completed: ${result.length} predictions`);
      await this.updateSyncStatus('predictions', 'success', result.length);
    } catch (error: any) {
      this.logger.error('Error in prediction catch-up', error);
      await this.updateSyncStatus('predictions', 'error', 0, error.message);
    }
  }

  /**
   * Daily archive: move fixtures older than 90 days into fixtures_archive.
   * Only archives fixtures not referenced by any accumulator_pick (tipster history preserved).
   * fixture_odds are deleted automatically (CASCADE). Runs at 2 AM.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleFixtureArchive() {
    if (!this.isSchedulingEnabled()) return;
    if (!(await this.syncLockService.tryStartSync('archive'))) {
      this.logger.debug('Fixture archive already running, skipping');
      return;
    }
    this.logger.log('Running scheduled fixture archive (90+ days old, not referenced by picks)...');
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);

      const toArchive = await this.fixtureRepo
        .createQueryBuilder('f')
        .where('f.match_date < :cutoff', { cutoff })
        .andWhere(
          'f.id NOT IN (SELECT fixture_id FROM accumulator_picks WHERE fixture_id IS NOT NULL)',
        )
        .take(500)
        .getMany();

      if (toArchive.length === 0) {
        await this.updateSyncStatus('archive', 'success', 0);
        this.logger.debug('No fixtures to archive');
        return;
      }

      const ids = toArchive.map((f) => f.id);
      await this.dataSource.transaction(async (tx) => {
        const archiveRows = toArchive.map((f) =>
          this.archiveRepo.create({
            originalId: f.id,
            apiId: f.apiId,
            leagueId: f.leagueId,
            homeTeamName: f.homeTeamName,
            awayTeamName: f.awayTeamName,
            leagueName: f.leagueName,
            matchDate: f.matchDate,
            status: f.status,
            homeScore: f.homeScore,
            awayScore: f.awayScore,
            htHomeScore: f.htHomeScore,
            htAwayScore: f.htAwayScore,
            syncedAt: f.syncedAt,
          }),
        );
        await tx.getRepository(FixtureArchive).save(archiveRows);
        await tx.getRepository(Fixture).delete(ids);
      });

      this.logger.log(`Archived ${ids.length} fixtures (match_date < ${cutoff.toISOString().split('T')[0]})`);
      await this.updateSyncStatus('archive', 'success', ids.length);
    } catch (error: any) {
      this.logger.error('Error in fixture archive', error);
      await this.updateSyncStatus('archive', 'error', 0, error.message);
    }
  }

  /**
   * Update finished volleyball games from API-Sports (every 2 hours).
   * Uses same API key as football. Free plan: 100 req/day — conservative schedule.
   */
  @Cron('0 */2 * * *')
  async handleVolleyballResultsUpdate() {
    if (!this.isSchedulingEnabled()) return;
    if (!(await this.syncLockService.tryStartSync('volleyball_results'))) return;
    this.logger.debug('Running volleyball results update...');
    try {
      const result = await this.volleyballSyncService.updateFinishedVolleyball();
      if (result.updated > 0) {
        this.logger.log(`Updated ${result.updated} volleyball result(s)`);
        await this.updateSyncStatus('volleyball_results', 'success', result.updated);
        await this.runSettlementIfIdle('volleyball_results');
      } else {
        await this.updateSyncStatus('volleyball_results', 'success', 0);
      }
    } catch (error: any) {
      this.logger.error('Error in volleyball results update', error);
      await this.updateSyncStatus('volleyball_results', 'error', 0, error.message);
    }
  }

  /**
   * Periodic settlement check (every minute).
   * Ensures coupons and accumulators settle soon after results sync; idempotent.
   */
  @Cron('*/1 * * * *')
  async handlePeriodicSettlement() {
    if (!this.isSchedulingEnabled()) return;
    if (!(await this.syncLockService.tryStartSync('settlement'))) {
      this.logger.debug('Periodic settlement already running, skipping');
      return;
    }
    this.logger.debug('Running periodic settlement check...');
    try {
      const result = await this.timedRun('periodic settlement', async () =>
        this.settlementService.runSettlement(),
      );
      if (result.ticketsSettled > 0) {
        this.logger.log(`Periodic settlement: ${result.ticketsSettled} tickets settled`);
      }
      await this.updateSyncStatus('settlement', 'success', result.ticketsSettled);
    } catch (error: any) {
      this.logger.error('Error in periodic settlement', error);
      await this.updateSyncStatus('settlement', 'error', 0, error.message);
    }
  }

}
