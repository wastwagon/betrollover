import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, QueryFailedError, Repository } from 'typeorm';
import {
  API_SPORTS_RETRY_MAX_ATTEMPTS,
  fetchApiSportsJsonWithRetry,
} from '../../common/fetch-with-429-retry.util';
import { Fixture } from './entities/fixture.entity';
import { FixtureOdd } from './entities/fixture-odd.entity';
import { League } from './entities/league.entity';
import { EnabledLeague } from './entities/enabled-league.entity';
import { MarketFilterService } from './market-filter.service';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { getSportApiBaseUrl } from '../../config/sports.config';
import { normalizeFixtureElapsed } from './fixture-status-elapsed.util';
import { extractHalftimeScores } from './fixture-halftime.util';
import {
  API_ODDS_CALL_DELAY_MS,
  MAX_FOOTBALL_ODDS_FIXTURES,
} from '../../config/api-limits.config';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Postgres foreign_key_violation — fixture deleted between lookup and odds insert. */
function isFkViolation(err: unknown): boolean {
  if (!(err instanceof QueryFailedError)) return false;
  const code = (err as QueryFailedError & { driverError?: { code?: string } }).driverError?.code;
  return code === '23503';
}

export type OddsSyncResult = { synced: number; errors: number; noOdds: number };

type OddRowInput = {
  marketName: string;
  marketValue: string;
  odds: number;
};

@Injectable()
export class OddsSyncService {
  private readonly logger = new Logger(OddsSyncService.name);
  private static readonly MAX_ODDS_PAGES_PER_DATE = 20;
  /** Skip re-polling fixtures that recently returned empty odds (process-local). */
  private static readonly EMPTY_ODDS_COOLDOWN_MS = 6 * 60 * 60 * 1000;
  private readonly emptyOddsUntil = new Map<number, number>();

  constructor(
    @InjectRepository(Fixture)
    private fixtureRepo: Repository<Fixture>,
    @InjectRepository(FixtureOdd)
    private oddsRepo: Repository<FixtureOdd>,
    @InjectRepository(League)
    private leagueRepo: Repository<League>,
    @InjectRepository(EnabledLeague)
    private enabledLeagueRepo: Repository<EnabledLeague>,
    @InjectRepository(ApiSettings)
    private apiSettingsRepo: Repository<ApiSettings>,
    private marketFilterService: MarketFilterService,
  ) {}

  private isInEmptyOddsCooldown(apiId: number): boolean {
    const until = this.emptyOddsUntil.get(apiId);
    if (until == null) return false;
    if (Date.now() >= until) {
      this.emptyOddsUntil.delete(apiId);
      return false;
    }
    return true;
  }

  private markEmptyOdds(apiId: number): void {
    this.emptyOddsUntil.set(apiId, Date.now() + OddsSyncService.EMPTY_ODDS_COOLDOWN_MS);
  }

  private clearEmptyOdds(apiId: number): void {
    this.emptyOddsUntil.delete(apiId);
  }

  /**
   * Replace odds for an existing fixture under a row lock so cleanup cannot delete mid-write.
   * @returns false if the fixture row is gone (race with cleanup).
   */
  private async replaceOddsLocked(
    em: EntityManager,
    fixtureId: number,
    filteredOdds: OddRowInput[],
  ): Promise<boolean> {
    const locked = await em
      .createQueryBuilder(Fixture, 'f')
      .setLock('pessimistic_write')
      .where('f.id = :id', { id: fixtureId })
      .getOne();
    if (!locked) return false;

    const syncedAt = new Date();
    const rows = filteredOdds.map((odd) => ({
      fixtureId,
      marketName: odd.marketName,
      marketValue: odd.marketValue,
      odds: odd.odds,
      bookmaker: null as string | null,
      syncedAt,
    }));

    await em.delete(FixtureOdd, { fixtureId });
    if (rows.length > 0) {
      await em.insert(FixtureOdd, rows);
    }
    return true;
  }

  /**
   * Upsert fixture + replace odds in one transaction (prevents FK races with no-odds cleanup).
   */
  private async upsertFixtureWithOdds(
    fixturePayload: Partial<Fixture> & { apiId: number },
    filteredOdds: OddRowInput[],
  ): Promise<{ fixtureDbId: number; rowCount: number } | null> {
    try {
      return await this.oddsRepo.manager.transaction(async (em) => {
        await em.upsert(Fixture, fixturePayload, ['apiId']);
        const locked = await em
          .createQueryBuilder(Fixture, 'f')
          .setLock('pessimistic_write')
          .where('f.apiId = :apiId', { apiId: fixturePayload.apiId })
          .getOne();
        if (!locked) return null;

        const syncedAt = new Date();
        const rows = filteredOdds.map((odd) => ({
          fixtureId: locked.id,
          marketName: odd.marketName,
          marketValue: odd.marketValue,
          odds: odd.odds,
          bookmaker: null as string | null,
          syncedAt,
        }));
        await em.delete(FixtureOdd, { fixtureId: locked.id });
        if (rows.length > 0) {
          await em.insert(FixtureOdd, rows);
        }
        return { fixtureDbId: locked.id, rowCount: rows.length };
      });
    } catch (err) {
      if (isFkViolation(err)) {
        this.logger.debug(
          `Odds write skipped for apiId=${fixturePayload.apiId}: fixture missing (FK race with cleanup)`,
        );
        return null;
      }
      throw err;
    }
  }

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

  private async fetchOddsJson(
    url: string,
    headers: Record<string, string>,
    logContext: string,
  ): Promise<{ ok: boolean; status: number; data: any | null; rateLimited: boolean }> {
    return fetchApiSportsJsonWithRetry(url, headers, {
      onRetry: ({ attempt, waitMs, reason }) => {
        this.logger.debug(
          `${logContext}: ${reason}, waiting ${waitMs}ms before retry ${attempt + 1}/${API_SPORTS_RETRY_MAX_ATTEMPTS}`,
        );
      },
    });
  }

  /**
   * Sync odds for fixtures from enabled leagues only
   * Filters markets by Tier 1 + Tier 2 configuration
   */
  async syncOddsForFixtures(fixtureIds: number[]): Promise<OddsSyncResult> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      this.logger.warn('API key not configured');
      return { synced: 0, errors: 0, noOdds: 0 };
    }

    const cappedIds =
      MAX_FOOTBALL_ODDS_FIXTURES > 0 && fixtureIds.length > MAX_FOOTBALL_ODDS_FIXTURES
        ? fixtureIds.slice(0, MAX_FOOTBALL_ODDS_FIXTURES)
        : fixtureIds;
    if (cappedIds.length < fixtureIds.length) {
      this.logger.warn(
        `Odds sync capped: processing ${cappedIds.length}/${fixtureIds.length} fixtures (API_MAX_FOOTBALL_ODDS_FIXTURES=${MAX_FOOTBALL_ODDS_FIXTURES})`,
      );
    }

    // Load market configs
    await this.marketFilterService.loadMarketConfigs();

    const headers = { 'x-apisports-key': apiKey };
    let synced = 0;
    let errors = 0;
    let noOdds = 0;
    let skippedCooldown = 0;

    // Get fixtures with their API IDs
    const fixtures = await this.fixtureRepo.find({
      where: { id: In(cappedIds) },
      select: ['id', 'apiId'],
    });

    let idx = 0;
    for (const fixture of fixtures) {
      try {
        if (this.isInEmptyOddsCooldown(fixture.apiId)) {
          skippedCooldown++;
          noOdds++;
          continue;
        }

        if (idx++ > 0) {
          await sleep(API_ODDS_CALL_DELAY_MS);
        }
        const { ok, status, data, rateLimited } = await this.fetchOddsJson(
          `${getSportApiBaseUrl('football')}/odds?fixture=${fixture.apiId}`,
          headers,
          `odds fixture=${fixture.apiId}`,
        );

        if (!ok || rateLimited) {
          this.logger.warn(
            `Failed to fetch odds for fixture ${fixture.apiId}: ${status}` +
              (rateLimited ? ` after ${API_SPORTS_RETRY_MAX_ATTEMPTS} attempts` : ''),
          );
          errors++;
          continue;
        }

        // Check if API returned data (common for lower leagues / unpublished odds)
        if (!data?.response || data.response.length === 0) {
          this.markEmptyOdds(fixture.apiId);
          noOdds++;
          this.logger.debug(`No odds data returned from API for fixture ${fixture.apiId}`);
          continue;
        }

        // Filter markets using MarketFilterService
        const filteredOdds = this.marketFilterService.filterOddsFromApiResponse(data);

        if (filteredOdds.length === 0) {
          this.markEmptyOdds(fixture.apiId);
          noOdds++;
          this.logger.debug(
            `No odds passed market filter for fixture ${fixture.apiId}. API returned ${data.response[0]?.bookmakers?.length || 0} bookmakers`,
          );
          continue;
        }

        let wrote = false;
        try {
          wrote = await this.oddsRepo.manager.transaction(async (em) =>
            this.replaceOddsLocked(em, fixture.id, filteredOdds),
          );
        } catch (err) {
          if (isFkViolation(err)) {
            this.logger.debug(
              `Odds write skipped for fixture ${fixture.apiId}: fixture missing (FK race with cleanup)`,
            );
            noOdds++;
            continue;
          }
          throw err;
        }

        if (!wrote) {
          this.logger.debug(
            `Odds write skipped for fixture ${fixture.apiId}: row deleted before insert`,
          );
          noOdds++;
          continue;
        }

        this.clearEmptyOdds(fixture.apiId);
        synced++;
        this.logger.log(`Synced ${filteredOdds.length} odds for fixture ${fixture.apiId} (${filteredOdds.map(o => o.marketName).filter((v, i, a) => a.indexOf(v) === i).join(', ')})`);
      } catch (error: any) {
        this.logger.error(`Error syncing odds for fixture ${fixture.id}:`, error);
        errors++;
      }
    }

    if (skippedCooldown > 0) {
      this.logger.debug(
        `Skipped ${skippedCooldown} fixture(s) still in empty-odds cooldown (${OddsSyncService.EMPTY_ODDS_COOLDOWN_MS / 3600000}h)`,
      );
    }

    return { synced, errors, noOdds };
  }

  /**
   * Sync odds for fixtures from enabled leagues (on-demand)
   * Called when user selects a fixture
   */
  async syncOddsForFixture(fixtureId: number): Promise<FixtureOdd[]> {
    // On-demand: clear cooldown so a user click always hits the API once.
    const fixture = await this.fixtureRepo.findOne({ where: { id: fixtureId }, select: ['apiId'] });
    if (fixture?.apiId != null) this.clearEmptyOdds(fixture.apiId);

    const result = await this.syncOddsForFixtures([fixtureId]);
    if (result.synced > 0) {
      return this.oddsRepo.find({ where: { fixtureId } });
    }
    return [];
  }

  /**
   * Odds-first sync: fetch odds by date (all pages), only persist fixtures that have Tier 1/2 odds.
   * Saves API credits vs N× /odds?fixture= calls.
   */
  async syncOddsFirst(dates: string[]): Promise<{ fixtures: number; odds: number; skipped: number }> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      this.logger.warn('API key not configured');
      return { fixtures: 0, odds: 0, skipped: 0 };
    }

    await this.marketFilterService.loadMarketConfigs();

    const enabledLeagues = await this.enabledLeagueRepo.find({
      where: { isActive: true },
      select: ['apiId'],
    });
    const enabledSet = new Set(enabledLeagues.map((l) => l.apiId));
    if (enabledSet.size === 0) {
      this.logger.warn('No enabled leagues');
      return { fixtures: 0, odds: 0, skipped: 0 };
    }

    const headers = { 'x-apisports-key': apiKey };
    let fixturesStored = 0;
    let oddsStored = 0;
    let skipped = 0;
    let requestIdx = 0;

    for (const date of dates) {
      try {
        let page = 1;
        let totalPages = 1;
        let safety = 0;

        while (page <= totalPages && safety < OddsSyncService.MAX_ODDS_PAGES_PER_DATE) {
          safety++;
          if (requestIdx++ > 0) {
            await sleep(API_ODDS_CALL_DELAY_MS);
          }

          const { ok, status, data, rateLimited } = await this.fetchOddsJson(
            `${getSportApiBaseUrl('football')}/odds?date=${date}&page=${page}`,
            headers,
            `odds date=${date} page=${page}`,
          );

          if (!ok || rateLimited) {
            this.logger.warn(
              `Odds by date ${date} page ${page}: ${status}` +
                (rateLimited ? ` after ${API_SPORTS_RETRY_MAX_ATTEMPTS} attempts` : ''),
            );
            break;
          }

          if (data?.errors && Object.keys(data.errors).length > 0) {
            this.logger.warn(`Odds API error for ${date} page ${page}: ${JSON.stringify(data.errors)}`);
            break;
          }

          const items = Array.isArray(data?.response) ? data.response : [];
          if (items.length === 0) break;

          for (const item of items) {
            const leagueId = item.league?.id;
            if (!leagueId || !enabledSet.has(leagueId)) {
              skipped++;
              continue;
            }

            const fix = item.fixture;
            const league = item.league;
            if (!fix?.id || fix.status?.short === 'FT' || fix.status?.short === 'AET' || fix.status?.short === 'PEN') {
              skipped++;
              continue;
            }

            const filteredOdds = this.marketFilterService.filterOddsFromApiResponse({ response: [item] });
            if (filteredOdds.length === 0) {
              skipped++;
              continue;
            }

            let leagueDbId: number | null = null;
            const leagueRecord = await this.leagueRepo.findOne({
              where: { apiId: league.id },
              select: ['id'],
            });
            leagueDbId = leagueRecord?.id ?? null;

            const home = item.teams?.home?.name ?? item.teams?.home?.team?.name ?? '';
            const away = item.teams?.away?.name ?? item.teams?.away?.team?.name ?? '';
            const homeName = (typeof home === 'string' && home.trim()) ? home.trim() : 'Home';
            const awayName = (typeof away === 'string' && away.trim()) ? away.trim() : 'Away';
            const ht = extractHalftimeScores(item);

            const persisted = await this.upsertFixtureWithOdds(
              {
                apiId: fix.id,
                leagueId: leagueDbId,
                leagueName: league?.name ?? null,
                homeTeamName: homeName,
                awayTeamName: awayName,
                matchDate: new Date(fix.date),
                status: fix.status?.short || 'NS',
                homeScore: item.goals?.home ?? null,
                awayScore: item.goals?.away ?? null,
                statusElapsed: normalizeFixtureElapsed(fix.status?.short, fix.status?.elapsed),
                syncedAt: new Date(),
                ...(ht.htHomeScore != null && ht.htAwayScore != null
                  ? { htHomeScore: ht.htHomeScore, htAwayScore: ht.htAwayScore }
                  : {}),
              },
              filteredOdds,
            );
            if (!persisted) {
              skipped++;
              continue;
            }
            this.clearEmptyOdds(fix.id);
            oddsStored += persisted.rowCount;
            fixturesStored++;
          }

          const current = Number(data?.paging?.current || page);
          const total = Number(data?.paging?.total || 1);
          totalPages = Number.isFinite(total) && total > 0 ? total : 1;
          if (!data?.paging || current >= totalPages) break;
          page = current + 1;
        }
      } catch (err: any) {
        this.logger.error(`Odds-first sync for date ${date}:`, err);
      }
    }

    this.logger.log(`Odds-first sync: ${fixturesStored} fixtures, ${oddsStored} odds, ${skipped} skipped (no Tier 1/2 odds or disabled league)`);
    return { fixtures: fixturesStored, odds: oddsStored, skipped };
  }
}
