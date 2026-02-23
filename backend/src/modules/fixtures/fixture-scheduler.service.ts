import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { FixtureUpdateService } from './fixture-update.service';
import { FootballSyncService } from './football-sync.service';
import { OddsSyncService } from './odds-sync.service';
import { SettlementService } from '../accumulators/settlement.service';
import { PredictionEngineService } from '../predictions/prediction-engine.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Fixture } from './entities/fixture.entity';
import { FixtureArchive } from './entities/fixture-archive.entity';
import { SyncStatus } from './entities/sync-status.entity';

/**
 * Scheduled Jobs for Fixture Updates & Syncing
 *
 * Schedule consolidated to 12 AM window:
 * - 12:00 AM: Daily fixture sync (7 days ahead)
 * - 1:00 AM: Odds force refresh + AI prediction generation (ready before 4–5 AM fixtures)
 * - 2:00 AM: Fixture archive + Prediction catch-up (if none for today)
 *
 * Set ENABLE_FOOTBALL_SYNC=false to skip football API (e.g. when using prod server).
 */
@Injectable()
export class FixtureSchedulerService {
  private readonly logger = new Logger(FixtureSchedulerService.name);

  constructor(
    private fixtureUpdateService: FixtureUpdateService,
    private footballSyncService: FootballSyncService,
    private oddsSyncService: OddsSyncService,
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
  ) { }

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
    await this.syncStatusRepo.upsert(payload as any, ['syncType']);
  }

  /** Skip if this sync type is already running (avoids overlapping runs). Treats running > 1 hour as stale (e.g. crash). */
  private async isSyncRunning(syncType: string): Promise<boolean> {
    const row = await this.syncStatusRepo.findOne({
      where: { syncType },
      select: ['status', 'updatedAt'],
    });
    if (row?.status !== 'running') return false;
    const updatedAt = row.updatedAt as Date | undefined;
    if (updatedAt) {
      const staleMs = 60 * 60 * 1000; // 1 hour
      if (Date.now() - new Date(updatedAt).getTime() > staleMs) {
        this.logger.warn(`${syncType} sync was running for >1h (stale), allowing new run`);
        return false;
      }
    }
    return true;
  }

  /**
   * Update live fixtures every 5 minutes. Skips if previous run still in progress.
   */
  @Cron('*/5 * * * *') // Every 5 minutes
  async handleLiveFixtureUpdate() {
    if (!this.isSchedulingEnabled()) return;
    if (await this.isSyncRunning('live')) return;
    this.logger.debug('Running scheduled live fixture update...');
    await this.updateSyncStatus('live', 'running');
    try {
      const result = await this.fixtureUpdateService.updateLiveFixtures();
      if (result.updated > 0) {
        this.logger.log(`Updated ${result.updated} live fixtures`);
        await this.updateSyncStatus('live', 'success', result.updated);

        // Trigger settlement check for updated fixtures
        await this.settlementService.checkAndSettleAccumulators();
      } else {
        await this.updateSyncStatus('live', 'success', 0);
      }
    } catch (error: any) {
      this.logger.error('Error in scheduled live fixture update', error);
      await this.updateSyncStatus('live', 'error', 0, error.message);
    }
  }

  /**
   * Update finished fixtures every 5 minutes. Skips if previous run still in progress.
   */
  @Cron('*/5 * * * *') // Every 5 minutes
  async handleFinishedFixtureUpdate() {
    if (!this.isSchedulingEnabled()) return;
    if (await this.isSyncRunning('finished')) return;
    this.logger.debug('Running scheduled finished fixture update...');
    await this.updateSyncStatus('finished', 'running');
    try {
      const result = await this.fixtureUpdateService.updateFinishedFixtures();
      if (result.updated > 0) {
        this.logger.log(`Updated ${result.updated} finished fixtures`);
        await this.updateSyncStatus('finished', 'success', result.updated);

        // Trigger settlement check immediately after fixture updates
        await this.settlementService.checkAndSettleAccumulators();
      } else {
        await this.updateSyncStatus('finished', 'success', 0);
      }
    } catch (error: any) {
      this.logger.error('Error in scheduled finished fixture update', error);
      await this.updateSyncStatus('finished', 'error', 0, error.message);
    }
  }

  /**
   * Daily fixture sync (runs at 12 AM server time)
   * Syncs fixtures for next 7 days from enabled leagues.
   * Then syncs odds (Tier 1/2 markets) for up to 80 fixtures without odds, soonest first.
   * Skipped when ENABLE_FOOTBALL_SYNC=false (e.g. football runs on prod, avoid credits here).
   */
  @Cron('0 0 * * *') // Every day at 12 AM (set TZ env if you need a specific timezone)
  async handleDailyFixtureSync() {
    if (!this.isSchedulingEnabled()) return;
    if (!this.isFootballSyncEnabled()) {
      this.logger.debug('Football sync disabled (ENABLE_FOOTBALL_SYNC=false), skipping');
      return;
    }
    if (await this.isSyncRunning('fixtures')) {
      this.logger.warn('Daily fixture sync already running, skipping this run');
      return;
    }
    this.logger.log('Running scheduled daily fixture sync (7 days ahead)...');
    await this.updateSyncStatus('fixtures', 'running');
    try {
      const result = await this.footballSyncService.sync();
      this.logger.log(
        `Daily sync completed: ${result.fixtures} fixtures synced for next 7 days, ${result.leagues} leagues`
      );
      if (result.leagues > 0 && result.fixtures === 0) {
        this.logger.warn(
          'No fixtures synced despite enabled leagues. Check API key (Admin → API Settings) and API-Football status.'
        );
      }
      await this.updateSyncStatus('fixtures', 'success', result.fixtures, null, result.leagues);
      // Odds-first sync: fixtures already include odds. Update odds status.
      await this.updateSyncStatus('odds', 'success', result.odds ?? 0);
    } catch (error: any) {
      this.logger.error('Error in daily fixture sync', error);
      await this.updateSyncStatus('fixtures', 'error', 0, error.message);
    }
  }

  /**
   * Sync odds for upcoming fixtures (runs every 2 hours)
   * Pre-loads odds for fixtures up to 7 days ahead that don't have odds yet (max 50 per run).
   * Prioritizes soonest matches. Uses Tier 1/2 market filter (BTTS, Correct Score, HT/FT).
   */
  @Cron('0 */2 * * *') // Every 2 hours
  async handleOddsSync() {
    if (!this.isSchedulingEnabled()) return;
    if (await this.isSyncRunning('odds')) {
      this.logger.debug('Odds sync already running, skipping');
      return;
    }
    this.logger.debug('Running scheduled odds sync for upcoming fixtures...');
    await this.updateSyncStatus('odds', 'running');
    try {
      const now = new Date();
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const fixturesWithOdds = await this.fixtureRepo
        .createQueryBuilder('f')
        .innerJoin('f.odds', 'o')
        .where("f.status IN ('NS', 'TBD')")
        .andWhere('f.match_date >= :now', { now })
        .andWhere('f.match_date <= :sevenDaysLater', { sevenDaysLater })
        .select('f.id')
        .getMany();

      const fixturesWithOddsIds = fixturesWithOdds.map(f => f.id);

      // Prioritize fixtures by match_date (soonest first) - today's matches get odds first
      const allFixtures = await this.fixtureRepo
        .createQueryBuilder('f')
        .where("f.status IN ('NS', 'TBD')")
        .andWhere('f.match_date >= :now', { now })
        .andWhere('f.match_date <= :sevenDaysLater', { sevenDaysLater })
        .orderBy('f.match_date', 'ASC')
        .getMany();

      const fixtures = allFixtures
        .filter(f => !fixturesWithOddsIds.includes(f.id))
        .slice(0, 100);

      if (fixtures.length > 0) {
        const fixtureIds = fixtures.map(f => f.id);
        const result = await this.oddsSyncService.syncOddsForFixtures(fixtureIds);
        this.logger.log(
          `Odds sync completed: ${result.synced} fixtures synced, ${result.errors} errors`
        );
        await this.updateSyncStatus('odds', 'success', result.synced);
      } else {
        await this.updateSyncStatus('odds', 'success', 0);
      }
    } catch (error: any) {
      this.logger.error('Error in scheduled odds sync', error);
      await this.updateSyncStatus('odds', 'error', 0, error.message);
    }
  }

  /**
   * Daily force refresh of odds (runs at 1 AM)
   * Re-syncs 50 soonest upcoming fixtures to apply latest Tier 1/2 market filter.
   */
  @Cron('0 1 * * *') // Every day at 1 AM
  async handleOddsForceRefresh() {
    if (!this.isSchedulingEnabled()) return;
    if (await this.isSyncRunning('odds_refresh')) {
      this.logger.debug('Odds force refresh already running, skipping');
      return;
    }
    this.logger.log('Running daily odds force refresh (BTTS, Correct Score, etc.)...');
    await this.syncStatusRepo.upsert(
      { syncType: 'odds_refresh', status: 'running' },
      ['syncType'],
    );
    try {
      const now = new Date();
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const allFixtures = await this.fixtureRepo
        .createQueryBuilder('f')
        .where("f.status IN ('NS', 'TBD')")
        .andWhere('f.match_date >= :now', { now })
        .andWhere('f.match_date <= :sevenDaysLater', { sevenDaysLater })
        .orderBy('f.match_date', 'ASC')
        .limit(50)
        .getMany();

      const fixtureIds = allFixtures.map(f => f.id);

      if (fixtureIds.length > 0) {
        const result = await this.oddsSyncService.syncOddsForFixtures(fixtureIds);
        this.logger.log(
          `Odds force refresh completed: ${result.synced} fixtures updated, ${result.errors} errors`
        );
      }
      await this.syncStatusRepo.upsert(
        { syncType: 'odds_refresh', status: 'success', lastSyncAt: new Date(), lastSyncCount: fixtureIds.length, lastError: null },
        ['syncType'],
      );
    } catch (error: any) {
      this.logger.error('Error in odds force refresh', error);
      await this.syncStatusRepo.upsert(
        { syncType: 'odds_refresh', status: 'error', lastError: error.message },
        ['syncType'],
      );
    }
  }

  /**
   * Daily prediction generation (runs at 1 AM server time)
   * Generates AI tipster predictions for today. Ready before early fixtures (4–5 AM).
   */
  @Cron('0 1 * * *')
  async handleDailyPredictionGeneration() {
    if (!this.isSchedulingEnabled()) return;
    if (await this.isSyncRunning('predictions')) {
      this.logger.warn('Prediction generation already running, skipping');
      return;
    }
    this.logger.log('Running scheduled daily prediction generation...');
    await this.updateSyncStatus('predictions', 'running');
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
   * Catch-up: if no predictions for today by 2 AM, run generation again.
   * Handles cases where 1 AM run failed or fixtures/odds weren't ready.
   */
  @Cron('0 2 * * *')
  async handlePredictionCatchUp() {
    if (!this.isSchedulingEnabled()) return;
    const count = await this.predictionEngine.getTodaysPredictionCount();
    if (count > 0) {
      this.logger.debug(`Catch-up skipped: ${count} predictions already exist for today`);
      return;
    }
    if (await this.isSyncRunning('predictions')) {
      this.logger.warn('Prediction generation already running, skipping catch-up');
      return;
    }
    this.logger.log('Catch-up: no predictions for today, running generation...');
    await this.updateSyncStatus('predictions', 'running');
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
    if (await this.isSyncRunning('archive')) {
      this.logger.debug('Fixture archive already running, skipping');
      return;
    }
    this.logger.log('Running scheduled fixture archive (90+ days old, not referenced by picks)...');
    await this.updateSyncStatus('archive', 'running');
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
   * Periodic settlement check (every 30 minutes)
   * Ensures all coupons and accumulators are settled even if fixture updates skipped.
   */
  @Cron('*/30 * * * *')
  async handlePeriodicSettlement() {
    if (!this.isSchedulingEnabled()) return;
    this.logger.debug('Running periodic settlement check...');
    try {
      const result = await this.settlementService.runSettlement();
      if (result.ticketsSettled > 0) {
        this.logger.log(`Periodic settlement: ${result.ticketsSettled} tickets settled`);
      }
    } catch (error: any) {
      this.logger.error('Error in periodic settlement', error);
    }
  }

}
