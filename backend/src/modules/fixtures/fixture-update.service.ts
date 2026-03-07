import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual, In, Not } from 'typeorm';
import { safeJson } from '../../common/fetch-json.util';
import { Fixture } from './entities/fixture.entity';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

import { getSportApiBaseUrl } from '../../config/sports.config';
import {
  MAX_FIXTURES_TO_UPDATE_PER_RUN,
  RESULTS_FETCH_BATCH_SIZE,
} from '../../config/api-limits.config';

@Injectable()
export class FixtureUpdateService {
  private readonly logger = new Logger(FixtureUpdateService.name);

  constructor(
    @InjectRepository(Fixture)
    private fixtureRepo: Repository<Fixture>,
    @InjectRepository(ApiSettings)
    private apiSettingsRepo: Repository<ApiSettings>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectDataSource() private dataSource: DataSource,
  ) { }

  private async getApiKey(): Promise<string> {
    try {
      const apiSettings = await this.apiSettingsRepo.findOne({
        where: { id: 1 },
        select: ['apiSportsKey'], // Only select the column we need
      });
      return apiSettings?.apiSportsKey || process.env.API_SPORTS_KEY || '';
    } catch (error: any) {
      // Fallback to env var if database query fails
      this.logger.warn('Failed to get API key from database, using env var', error.message);
      return process.env.API_SPORTS_KEY || '';
    }
  }

  private async updateUsage(headers: Headers): Promise<void> {
    const rateLimitRemaining = headers.get('x-ratelimit-requests-remaining');
    const rateLimitLimit = headers.get('x-ratelimit-requests-limit');

    if (rateLimitRemaining !== null && rateLimitLimit !== null) {
      try {
        // Use update instead of save to avoid loading all columns
        await this.apiSettingsRepo.update(
          { id: 1 },
          {
            dailyRequestsUsed: parseInt(rateLimitLimit, 10) - parseInt(rateLimitRemaining, 10),
            dailyRequestsLimit: parseInt(rateLimitLimit, 10),
            lastRequestDate: new Date(),
          }
        );
      } catch (error: any) {
        // If column doesn't exist, log warning but don't fail
        if (error.message?.includes('minimum_roi')) {
          this.logger.warn('minimum_roi column missing, using update query');
          // Try with raw query as fallback
          await this.apiSettingsRepo.query(
            `UPDATE api_settings SET daily_requests_used = $1, daily_requests_limit = $2, last_request_date = $3 WHERE id = 1`,
            [
              parseInt(rateLimitLimit, 10) - parseInt(rateLimitRemaining, 10),
              parseInt(rateLimitLimit, 10),
              new Date(),
            ]
          );
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Update live fixtures (matches in progress)
   * Called every 15 minutes during match days
   */
  async updateLiveFixtures(): Promise<{ updated: number; errors: number }> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      this.logger.warn('API key not configured, skipping live fixture update');
      return { updated: 0, errors: 0 };
    }

    try {
      // Check cache first (30 second TTL)
      const cacheKey = 'fixtures:live:update';
      const cached = await this.cacheManager.get<{ updated: number; timestamp: number }>(cacheKey);
      if (cached && Date.now() - cached.timestamp < 30000) {
        this.logger.debug('Using cached live fixtures data');
        return { updated: cached.updated, errors: 0 };
      }

      // Fetch live fixtures from API
      const res = await fetch(`${getSportApiBaseUrl('football')}/fixtures/live`, {
        headers: { 'x-apisports-key': apiKey },
      });

      if (!res.ok) {
        const errorData = await safeJson(res).catch(() => ({}));
        this.logger.error(`Failed to fetch live fixtures: ${res.status}`, errorData);
        return { updated: 0, errors: 1 };
      }

      await this.updateUsage(res.headers);
      const data = await safeJson<any>(res);
      const liveFixtures = data.response || [];

      // Get fixtures in database that are live or about to be live
      const dbFixtures = await this.fixtureRepo.find({
        where: { status: In(['NS', '1H', 'HT', '2H', 'ET', 'BT', 'P']) },
        select: ['id', 'apiId'],
      });

      const apiIdMap = new Map(liveFixtures.map((f: any) => [f.fixture.id, f]));
      const dbApiIdMap = new Map(dbFixtures.map(f => [f.apiId, f.id]));

      let updated = 0;
      for (const fixtureData of liveFixtures) {
        const apiId = fixtureData.fixture.id;
        const dbId = dbApiIdMap.get(apiId);

        if (!dbId) continue; // Only update fixtures we have in DB

        const fix = fixtureData.fixture;
        const goals = fixtureData.goals;

        await this.fixtureRepo.update(
          { id: dbId },
          {
            status: fix.status.short,
            homeScore: goals?.home ?? null,
            awayScore: goals?.away ?? null,
            syncedAt: new Date(),
          }
        );
        updated++;
      }

      // Cache the result
      await this.cacheManager.set(cacheKey, { updated, timestamp: Date.now() }, 30 * 1000);

      this.logger.log(`Updated ${updated} live fixtures`);
      return { updated, errors: 0 };
    } catch (error: any) {
      this.logger.error('Error updating live fixtures', error);
      return { updated: 0, errors: 1 };
    }
  }

  /**
   * Update finished fixtures (matches that have ended)
   * Called every 30 minutes during match days
   */
  async updateFinishedFixtures(): Promise<{ updated: number; errors: number }> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      this.logger.warn('API key not configured, skipping finished fixture update');
      return { updated: 0, errors: 0 };
    }

    try {
      const now = new Date();
      let updated = 0;

      // PASS 1: Fixtures with pending accumulator picks (user coupons) — fetch these first, no limit
      const pendingRows = await this.dataSource.query<{ fixture_id: number }[]>(
        `SELECT DISTINCT ap.fixture_id FROM accumulator_picks ap
         JOIN fixtures f ON f.id = ap.fixture_id
         WHERE ap.result = 'pending' AND ap.fixture_id IS NOT NULL
         AND f.status != 'FT' AND f.match_date <= $1`,
        [now],
      );
      const pendingIds = [...new Set(pendingRows.map((r) => r.fixture_id))];
      if (pendingIds.length > 0) {
        const pendingFixtures = await this.fixtureRepo.find({
          where: { id: In(pendingIds) },
          select: ['id', 'apiId'],
        });
        const fromPass1 = await this.fetchAndUpdateBatch(apiKey, pendingFixtures);
        updated += fromPass1;
        if (fromPass1 > 0) {
          this.logger.log(`Updated ${fromPass1} fixture(s) with pending picks`);
        }
      }

      // PASS 2: Other unfinished fixtures (exclude pass 1 to avoid duplicate API calls)
      const qb = this.fixtureRepo
        .createQueryBuilder('f')
        .select(['f.id', 'f.apiId'])
        .where('f.status != :ft', { ft: 'FT' })
        .andWhere('f.match_date <= :now', { now })
        .orderBy('f.match_date', 'DESC')
        .take(MAX_FIXTURES_TO_UPDATE_PER_RUN);
      if (pendingIds.length > 0) {
        qb.andWhere('f.id NOT IN (:...ids)', { ids: pendingIds });
      }
      const otherUnfinished = await qb.getMany();
      if (otherUnfinished.length > 0) {
        const fromPass2 = await this.fetchAndUpdateBatch(apiKey, otherUnfinished);
        updated += fromPass2;
      }

      this.logger.log(`Updated ${updated} finished fixtures`);
      return { updated, errors: 0 };
    } catch (error: any) {
      this.logger.error('Error updating finished fixtures', error);
      return { updated: 0, errors: 1 };
    }
  }

  private async fetchAndUpdateBatch(
    apiKey: string,
    fixtures: { id: number; apiId: number }[],
  ): Promise<number> {
    if (fixtures.length === 0) return 0;
    const batchSize = RESULTS_FETCH_BATCH_SIZE;
    let updated = 0;
    const dbApiIdMap = new Map(fixtures.map((f) => [f.apiId, f.id]));

    for (let i = 0; i < fixtures.length; i += batchSize) {
      const batch = fixtures.slice(i, i + batchSize);
      const apiIdsString = batch.map((f) => f.apiId).join('-');

      const res = await fetch(`${getSportApiBaseUrl('football')}/fixtures?ids=${apiIdsString}`, {
        headers: { 'x-apisports-key': apiKey },
      });

      if (!res.ok) {
        const errorData = await safeJson(res).catch(() => ({}));
        this.logger.error(`Failed to fetch fixtures batch: ${res.status}`, errorData);
        continue;
      }

      await this.updateUsage(res.headers);
      const data = await safeJson<any>(res);
      const response = data.response || [];

      for (const fixtureData of response) {
        const apiId = fixtureData.fixture.id;
        const dbId = dbApiIdMap.get(apiId);
        if (!dbId) continue;

        const fix = fixtureData.fixture;
        const goals = fixtureData.goals;
        if (goals?.home !== null && goals?.away !== null) {
          await this.fixtureRepo.update(
            { id: dbId },
            {
              status: fix.status.short,
              homeScore: goals.home,
              awayScore: goals.away,
              syncedAt: new Date(),
            },
          );
          updated++;
          await this.cacheManager.del(`fixture:${dbId}`);
          await this.cacheManager.del(`fixture:api:${apiId}`);
        }
      }
    }
    return updated;
  }
}
