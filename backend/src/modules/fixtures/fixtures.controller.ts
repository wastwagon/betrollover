import { Controller, Get, Post, Param, Query, UseGuards, ParseIntPipe, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { FixturesService } from './fixtures.service';
import { OddsSyncService } from './odds-sync.service';
import { FixtureUpdateService } from './fixture-update.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SyncStatus } from './entities/sync-status.entity';

@Controller('fixtures')
export class FixturesController {
  private readonly logger = new Logger(FixturesController.name);

  constructor(
    private readonly fixturesService: FixturesService,
    private readonly oddsSyncService: OddsSyncService,
    private readonly fixtureUpdateService: FixtureUpdateService,
    @InjectRepository(SyncStatus)
    private syncStatusRepo: Repository<SyncStatus>,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(
    @Query('date') date?: string,
    @Query('days') days?: string,
    @Query('league') leagueId?: string,
    @Query('country') country?: string,
    @Query('team') team?: string,
    @Query('category') category?: string,
    @Query('bookmaker_tier') bookmakerTier?: string,
    @Query('include_odds') includeOdds?: string,
  ) {
    return this.fixturesService.list(
      date,
      days ? parseInt(days, 10) : undefined,
      leagueId ? parseInt(leagueId, 10) : undefined,
      country,
      team,
      category,
      bookmakerTier,
      includeOdds === 'true' || includeOdds === '1',
    );
  }

  @Get('leagues')
  @UseGuards(JwtAuthGuard)
  getLeagues() {
    return this.fixturesService.getLeagues();
  }

  @Get('filters')
  @UseGuards(JwtAuthGuard)
  getFilterOptions() {
    return this.fixturesService.getFilterOptions();
  }

  @Get('sync/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getSyncStatus() {
    const statuses = await this.syncStatusRepo.find({
      order: { syncType: 'ASC' },
    });
    return statuses;
  }

  @Post('sync/backfill-teams')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async backfillTeamNames() {
    return this.fixturesService.backfillHomeAwayTeamNames();
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async sync() {
    // Update status to running
    await this.syncStatusRepo.upsert(
      { syncType: 'fixtures', status: 'running' },
      ['syncType'],
    );

    try {
      const result = await this.fixturesService.runSync();
      
      // Update status to success
      await this.syncStatusRepo.upsert(
        {
          syncType: 'fixtures',
          status: 'success',
          lastSyncAt: new Date(),
          lastSyncCount: result.fixtures,
          lastSyncLeagues: result.leagues ?? null,
          lastError: null,
        },
        ['syncType'],
      );

      // Odds-first sync: fixtures already include odds. Update odds status.
      await this.syncStatusRepo.upsert(
        {
          syncType: 'odds',
          status: 'success',
          lastSyncAt: new Date(),
          lastSyncCount: result.odds ?? 0,
          lastError: null,
        },
        ['syncType'],
      );

      return result;
    } catch (error: any) {
      // Update status to error
      await this.syncStatusRepo.upsert(
        {
          syncType: 'fixtures',
          status: 'error',
          lastError: error.message,
        },
        ['syncType'],
      );
      throw error;
    }
  }

  @Post('sync/odds')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async syncOddsManual(@Query('force') force?: string) {
    // Update status to running
    await this.syncStatusRepo.upsert(
      { syncType: 'odds', status: 'running' },
      ['syncType'],
    );

    try {
      const now = new Date();
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const forceRefresh = force === 'true' || force === '1';

      let fixtureIds: number[];

      if (forceRefresh) {
        // Force: re-sync upcoming fixtures (replaces odds with new market filter: BTTS, etc.)
        const allFixtures = await this.fixturesService.fixtureRepo
          .createQueryBuilder('f')
          .where("f.status IN ('NS', 'TBD')")
          .andWhere('f.match_date >= :now', { now })
          .andWhere('f.match_date <= :sevenDaysLater', { sevenDaysLater })
          .orderBy('f.match_date', 'ASC')
          .limit(150)
          .getMany();
        fixtureIds = allFixtures.map(f => f.id);
      } else {
        // Default: only fixtures without odds (batch up to 200)
        const fixturesWithOdds = await this.fixturesService.fixtureRepo
          .createQueryBuilder('f')
          .innerJoin('f.odds', 'o')
          .where("f.status IN ('NS', 'TBD')")
          .andWhere('f.match_date >= :now', { now })
          .andWhere('f.match_date <= :sevenDaysLater', { sevenDaysLater })
          .select('f.id')
          .getMany();
        const fixturesWithOddsIds = fixturesWithOdds.map(f => f.id);
        const allFixtures = await this.fixturesService.fixtureRepo
          .createQueryBuilder('f')
          .where("f.status IN ('NS', 'TBD')")
          .andWhere('f.match_date >= :now', { now })
          .andWhere('f.match_date <= :sevenDaysLater', { sevenDaysLater })
          .getMany();
        fixtureIds = allFixtures
          .filter(f => !fixturesWithOddsIds.includes(f.id))
          .slice(0, 200)
          .map(f => f.id);
      }
      
      if (fixtureIds.length === 0) {
        // No fixtures need odds sync
        await this.syncStatusRepo.upsert(
          {
            syncType: 'odds',
            status: 'success',
            lastSyncAt: new Date(),
            lastSyncCount: 0,
            lastError: null,
          },
          ['syncType'],
        );
        return { synced: 0, errors: 0 };
      }
      
      const result = await this.oddsSyncService.syncOddsForFixtures(fixtureIds);

      // Update status to success
      await this.syncStatusRepo.upsert(
        {
          syncType: 'odds',
          status: 'success',
          lastSyncAt: new Date(),
          lastSyncCount: result.synced,
          lastError: null,
        },
        ['syncType'],
      );

      return result;
    } catch (error: any) {
      await this.syncStatusRepo.upsert(
        {
          syncType: 'odds',
          status: 'error',
          lastError: error.message,
        },
        ['syncType'],
      );
      throw error;
    }
  }

  /**
   * Manually fetch results for past football matches that are not yet marked FT.
   * Mirrors what the every-5-min cron does but can be triggered on demand by admin.
   * Use when a match has finished but settlement hasn't run yet.
   */
  @Post('sync/results')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async fetchResults() {
    this.logger.log('Manual result fetch triggered by admin');
    const result = await this.fixtureUpdateService.updateFinishedFixtures();
    await this.syncStatusRepo.upsert(
      {
        syncType: 'results',
        status: 'success',
        lastSyncAt: new Date(),
        lastSyncCount: result.updated,
        lastError: null,
      },
      ['syncType'],
    );
    return result;
  }

  /**
   * Fetch live scores for in-progress fixtures on demand.
   */
  @Post('sync/live')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async fetchLive() {
    this.logger.log('Manual live fixture update triggered by admin');
    return this.fixtureUpdateService.updateLiveFixtures();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getById(@Param('id', ParseIntPipe) id: number) {
    const fixture = await this.fixturesService.getById(id, true);
    return fixture;
  }

  @Post(':id/odds')
  @UseGuards(JwtAuthGuard)
  async syncOdds(@Param('id', ParseIntPipe) id: number) {
    const odds = await this.oddsSyncService.syncOddsForFixture(id);
    return { success: true, odds };
  }
}
