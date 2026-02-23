import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { safeJson } from '../../common/fetch-json.util';
import { Fixture } from './entities/fixture.entity';
import { League } from './entities/league.entity';
import { EnabledLeague } from './entities/enabled-league.entity';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { OddsSyncService } from './odds-sync.service';

import { getSportApiBaseUrl } from '../../config/sports.config';
import {
  getSyncDates,
  MAX_FOOTBALL_ODDS_FIXTURES,
  MAX_LEAGUE_BACKFILL_PER_RUN,
  SYNC_LOOKAHEAD_DAYS,
} from '../../config/api-limits.config';

/** Extract team names from API response - handles various response structures */
function extractTeamNames(item: any): { home: string; away: string } {
  const home =
    item?.teams?.home?.name ??
    item?.teams?.home?.team?.name ??
    item?.fixture?.teams?.home?.name ??
    '';
  const away =
    item?.teams?.away?.name ??
    item?.teams?.away?.team?.name ??
    item?.fixture?.teams?.away?.name ??
    '';
  return {
    home: (typeof home === 'string' && home.trim()) ? home.trim() : 'Home',
    away: (typeof away === 'string' && away.trim()) ? away.trim() : 'Away',
  };
}

/** Extract team logo URLs from API response (nullable - no break if missing) */
function extractTeamLogos(item: any): { home: string | null; away: string | null } {
  const home = item?.teams?.home?.logo ?? item?.teams?.home?.team?.logo ?? null;
  const away = item?.teams?.away?.logo ?? item?.teams?.away?.team?.logo ?? null;
  return {
    home: typeof home === 'string' && home.startsWith('http') ? home : null,
    away: typeof away === 'string' && away.startsWith('http') ? away : null,
  };
}

import { extractCountryCodesFromTeams } from '../../common/team-country.util';

/** Extract country codes from API (for internationals). Nullable. */
function extractCountryCodes(item: any): { home: string | null; away: string | null } {
  return extractCountryCodesFromTeams(item?.teams?.home, item?.teams?.away);
}

@Injectable()
export class FootballSyncService {
  private readonly logger = new Logger(FootballSyncService.name);

  constructor(
    @InjectRepository(Fixture)
    private fixtureRepo: Repository<Fixture>,
    @InjectRepository(League)
    private leagueRepo: Repository<League>,
    @InjectRepository(EnabledLeague)
    private enabledLeagueRepo: Repository<EnabledLeague>,
    @InjectRepository(ApiSettings)
    private apiSettingsRepo: Repository<ApiSettings>,
    private oddsSyncService: OddsSyncService,
  ) {}

  private async getKey(): Promise<string> {
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

  async sync(): Promise<{ fixtures: number; odds: number; leagues: number }> {
    const key = await this.getKey();
    if (!key) return { fixtures: 0, odds: 0, leagues: 0 };

    const headers = { 'x-apisports-key': key };
    let fixturesCount = 0;
    let oddsCount = 0;

    // 1. Get enabled league IDs
    const enabledLeagues = await this.enabledLeagueRepo.find({
      where: { isActive: true },
      select: ['apiId'],
    });
    const enabledLeagueIds = enabledLeagues.map(l => l.apiId);
    
    if (enabledLeagueIds.length === 0) {
      this.logger.warn('No enabled leagues found');
      return { fixtures: 0, odds: 0, leagues: 0 };
    }
    this.logger.log(`Sync: ${enabledLeagueIds.length} enabled leagues, key: ${key ? '***' + key.slice(-4) : 'MISSING'}`);

    // 2. Sync enabled leagues metadata: league + cup (so cups in enabled_leagues get fixtures)
    const [leagueRes, cupRes] = await Promise.all([
      fetch(`${getSportApiBaseUrl('football')}/leagues?type=league&current=true`, { headers }),
      fetch(`${getSportApiBaseUrl('football')}/leagues?type=cup&current=true`, { headers }),
    ]);
    const leagueData = await safeJson<any>(leagueRes);
    const cupData = await safeJson<any>(cupRes);
    const leagueList = leagueData.response || [];
    const cupList = cupData.response || [];
    const enabledSet = new Set(enabledLeagueIds);
    const seenIds = new Set<number>();

    for (const l of [...leagueList, ...cupList]) {
      const league = l.league;
      if (!league?.id || !enabledSet.has(league.id) || seenIds.has(league.id)) continue;
      seenIds.add(league.id);

      await this.leagueRepo.upsert(
        {
          apiId: league.id,
          name: league.name,
          country: league.country,
          logo: league.logo,
          season: l.seasons?.[0]?.year,
          syncedAt: new Date(),
        },
        ['apiId'],
      );
    }

    // 2b. Backfill league metadata for enabled leagues not returned as "current" (so dropdowns show all)
    const existingInDb = await this.leagueRepo.find({ where: { apiId: In(enabledLeagueIds) }, select: ['apiId'] });
    const existingIds = new Set(existingInDb.map((r) => r.apiId));
    const missingIds = enabledLeagueIds.filter((id) => !existingIds.has(id));
    const toFetch = missingIds.slice(0, MAX_LEAGUE_BACKFILL_PER_RUN);
    if (toFetch.length > 0) {
      this.logger.log(`Backfilling league metadata for ${toFetch.length} enabled leagues not in current API response`);
    }
    for (const apiId of toFetch) {
      try {
        const res = await fetch(`${getSportApiBaseUrl('football')}/leagues?id=${apiId}`, { headers });
        const data = await safeJson<any>(res);
        const items = data.response || [];
        const l = items[0];
        if (l?.league) {
          const league = l.league;
          await this.leagueRepo.upsert(
            {
              apiId: league.id,
              name: league.name,
              country: league.country,
              logo: league.logo,
              season: l.seasons?.[0]?.year,
              syncedAt: new Date(),
            },
            ['apiId'],
          );
        }
      } catch (err) {
        this.logger.warn(`Failed to fetch league ${apiId}: ${err}`);
      }
    }

    // 3. Fixture-first sync: get ALL fixtures for next N days (full global coverage)
    const dates = getSyncDates();

    this.logger.log(`Fixture-first sync for ${dates.length} days (UTC): ${dates[0]} to ${dates[dates.length - 1]}`);
    const result = await this.syncFixturesFirst(dates, headers, enabledLeagueIds);
    fixturesCount = result.fixtures;
    oddsCount = result.odds;

    return { fixtures: fixturesCount, odds: oddsCount, leagues: enabledLeagues.length };
  }

  /** Sync fixtures by date (full coverage), then odds for fixtures without odds */
  private async syncFixturesFirst(
    dates: string[],
    headers: Record<string, string>,
    enabledLeagueIds: number[],
  ): Promise<{ fixtures: number; odds: number }> {
    const enabledSet = new Set(enabledLeagueIds);
    let fixturesCount = 0;

    for (const date of dates) {
      // API-Football fixtures endpoint does NOT support 'page' param - fetch once per date
      const res = await fetch(`${getSportApiBaseUrl('football')}/fixtures?date=${date}`, { headers });
      const data = await safeJson<any>(res);
      if (data.errors && Object.keys(data.errors).length > 0) {
        this.logger.warn(`API error for ${date}: ${JSON.stringify(data.errors)}`);
        continue;
      }
      const raw = data.response || [];
      const items = raw.filter(
        (f: any) => f.league?.id && enabledSet.has(f.league.id),
      );
      if (raw.length > 0 && items.length === 0) {
        const sampleLeagueIds = raw.slice(0, 5).map((f: any) => f.league?.id).filter(Boolean);
        this.logger.warn(
          `Date ${date}: API returned ${raw.length} fixtures but 0 matched enabled leagues. ` +
          `Sample league IDs: ${sampleLeagueIds.join(',')}. ` +
          `Enabled count: ${enabledSet.size}. Has 162: ${enabledSet.has(162)}`,
        );
      }

      for (const f of items) {
          const fix = f.fixture;
          const league = f.league;
          let leagueDbId: number | null = null;
          if (league?.id) {
            const rec = await this.leagueRepo.findOne({ where: { apiId: league.id }, select: ['id'] });
            leagueDbId = rec?.id ?? null;
          }
          const { home: homeName, away: awayName } = extractTeamNames(f);
          const { home: homeLogo, away: awayLogo } = extractTeamLogos(f);
          const { home: homeCc, away: awayCc } = extractCountryCodes(f);
          await this.fixtureRepo.upsert(
            {
              apiId: fix.id,
              leagueId: leagueDbId,
              leagueName: league?.name,
              homeTeamName: homeName,
              awayTeamName: awayName,
              homeTeamLogo: homeLogo,
              awayTeamLogo: awayLogo,
              homeCountryCode: homeCc,
              awayCountryCode: awayCc,
              matchDate: new Date(fix.date),
              status: fix.status?.short || 'NS',
              homeScore: f.goals?.home ?? null,
              awayScore: f.goals?.away ?? null,
              syncedAt: new Date(),
            },
            ['apiId'],
          );
          fixturesCount++;
        }
    }

    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + SYNC_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);
    const withoutOdds = await this.fixtureRepo
      .createQueryBuilder('f')
      .leftJoin('f.odds', 'o')
      .where("f.status IN ('NS', 'TBD')")
      .andWhere('f.match_date >= :now', { now })
      .andWhere('f.match_date <= :end', { end: sevenDaysLater })
      .andWhere('o.id IS NULL')
      .orderBy('f.match_date', 'ASC')
      .limit(MAX_FOOTBALL_ODDS_FIXTURES)
      .getMany();

    let oddsCount = 0;
    if (withoutOdds.length > 0) {
      const result = await this.oddsSyncService.syncOddsForFixtures(withoutOdds.map((x) => x.id));
      oddsCount = result.synced;
    }

    // Backfill: fix fixtures with "Home vs Away" by fetching details from API
    await this.backfillHomeAwayTeamNames(headers, now, sevenDaysLater);

    return { fixtures: fixturesCount, odds: oddsCount };
  }

  /** Fetch fixture details for "Home vs Away" placeholders and update with real team names. Callable standalone for admin. */
  async backfillHomeAwayTeamNames(
    headersOrNull?: Record<string, string> | null,
    now?: Date,
    sevenDaysLater?: Date,
  ): Promise<number> {
    const key = await this.getKey();
    if (!key) return 0;
    const headers = headersOrNull ?? { 'x-apisports-key': key };
    const n = now ?? new Date();
    const end = sevenDaysLater ?? new Date(n.getTime() + 30 * 24 * 60 * 60 * 1000);
    const placeholders = await this.fixtureRepo
      .createQueryBuilder('f')
      .where("f.homeTeamName = 'Home' AND f.awayTeamName = 'Away'")
      .andWhere("f.status IN ('NS', 'TBD')")
      .andWhere('f.match_date >= :now', { now: n })
      .andWhere('f.match_date <= :end', { end })
      .select(['f.id', 'f.apiId'])
      .getMany();
    if (placeholders.length === 0) {
      this.logger.debug('Backfill: no Home vs Away fixtures found');
      return 0;
    }
    this.logger.log(`Backfill: found ${placeholders.length} Home vs Away fixture(s) to fix`);

    const apiIds = placeholders.map((f) => f.apiId);
    const chunks: number[][] = [];
    for (let i = 0; i < apiIds.length; i += 20) {
      chunks.push(apiIds.slice(i, i + 20));
    }

    let fixed = 0;
    for (const chunk of chunks) {
      try {
        const res = await fetch(`${getSportApiBaseUrl('football')}/fixtures?id=${chunk.join(',')}`, { headers });
        if (!res.ok) continue;
        const data = await safeJson<any>(res);
        const items = data?.response || [];
        for (const item of items) {
          const { home, away } = extractTeamNames(item);
          const { home: homeLogo, away: awayLogo } = extractTeamLogos(item);
          const { home: homeCc, away: awayCc } = extractCountryCodes(item);
          if (home === 'Home' && away === 'Away') continue;
          const apiId = item.fixture?.id;
          if (!apiId) continue;
          await this.fixtureRepo.update(
            { apiId },
            { homeTeamName: home, awayTeamName: away, homeTeamLogo: homeLogo, awayTeamLogo: awayLogo, homeCountryCode: homeCc, awayCountryCode: awayCc, syncedAt: new Date() },
          );
          fixed++;
        }
      } catch {
        // ignore
      }
    }
    if (fixed > 0) {
      this.logger.log(`Backfilled ${fixed} fixture(s) with real team names (was "Home vs Away")`);
    }
    return fixed;
  }
}
