import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, In, Not } from 'typeorm';
import { Fixture } from './entities/fixture.entity';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

const API_SPORTS_BASE = 'https://v3.football.api-sports.io';

@Injectable()
export class FixtureUpdateService {
  private readonly logger = new Logger(FixtureUpdateService.name);

  constructor(
    @InjectRepository(Fixture)
    private fixtureRepo: Repository<Fixture>,
    @InjectRepository(ApiSettings)
    private apiSettingsRepo: Repository<ApiSettings>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

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
      const res = await fetch(`${API_SPORTS_BASE}/fixtures/live`, {
        headers: { 'x-apisports-key': apiKey },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        this.logger.error(`Failed to fetch live fixtures: ${res.status}`, errorData);
        return { updated: 0, errors: 1 };
      }

      await this.updateUsage(res.headers);
      const data = await res.json();
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
      // Find fixtures in DB that should be finished but aren't marked as FT
      const now = new Date();
      const unfinishedFixtures = await this.fixtureRepo.find({
        where: {
          status: Not('FT'),
          matchDate: LessThanOrEqual(now),
        },
        select: ['id', 'apiId'],
        take: 50, // Batch size
      });

      if (unfinishedFixtures.length === 0) {
        return { updated: 0, errors: 0 };
      }

      // Fetch results in batches (API supports comma-separated IDs)
      const apiIds = unfinishedFixtures.map(f => f.apiId).join(',');
      const res = await fetch(`${API_SPORTS_BASE}/fixtures?id=${apiIds}`, {
        headers: { 'x-apisports-key': apiKey },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        this.logger.error(`Failed to fetch finished fixtures: ${res.status}`, errorData);
        return { updated: 0, errors: 1 };
      }

      await this.updateUsage(res.headers);
      const data = await res.json();
      const fixtures = data.response || [];

      const dbApiIdMap = new Map(unfinishedFixtures.map(f => [f.apiId, f.id]));
      let updated = 0;

      for (const fixtureData of fixtures) {
        const apiId = fixtureData.fixture.id;
        const dbId = dbApiIdMap.get(apiId);
        
        if (!dbId) continue;

        const fix = fixtureData.fixture;
        const goals = fixtureData.goals;
        
        // Only update if match is finished
        if (fix.status.short === 'FT' && goals?.home !== null && goals?.away !== null) {
          await this.fixtureRepo.update(
            { id: dbId },
            {
              status: 'FT',
              homeScore: goals.home,
              awayScore: goals.away,
              syncedAt: new Date(),
            }
          );
          updated++;

          // Invalidate cache for this fixture
          await this.cacheManager.del(`fixture:${dbId}`);
          await this.cacheManager.del(`fixture:api:${apiId}`);
        }
      }

      this.logger.log(`Updated ${updated} finished fixtures`);
      return { updated, errors: 0 };
    } catch (error: any) {
      this.logger.error('Error updating finished fixtures', error);
      return { updated: 0, errors: 1 };
    }
  }
}
