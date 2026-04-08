import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Fixture } from './entities/fixture.entity';
import { FixtureOdd } from './entities/fixture-odd.entity';
import { League } from './entities/league.entity';
import { EnabledLeague } from './entities/enabled-league.entity';
import { FootballSyncService } from './football-sync.service';
import { OddsSyncService } from './odds-sync.service';
import { SYNC_LOOKAHEAD_DAYS } from '../../config/api-limits.config';

// Expose fixtureRepo for controller use
declare module './fixtures.service' {
  interface FixturesService {
    fixtureRepo: Repository<Fixture>;
  }
}

@Injectable()
export class FixturesService {
  constructor(
    @InjectRepository(Fixture)
    public fixtureRepo: Repository<Fixture>, // Make public for controller access
    @InjectRepository(FixtureOdd)
    private oddsRepo: Repository<FixtureOdd>,
    @InjectRepository(League)
    private leagueRepo: Repository<League>,
    @InjectRepository(EnabledLeague)
    private enabledLeagueRepo: Repository<EnabledLeague>,
    private syncService: FootballSyncService,
    private oddsSyncService: OddsSyncService,
  ) {}

  async list(
    date?: string,
    days?: number,
    leagueId?: number,
    country?: string,
    team?: string,
    category?: string,
    bookmakerTier?: string,
    includeOdds = false,
    includeNoOdds = false,
    limit?: number,
    offset?: number,
  ) {
    const enabledWhere: { isActive: boolean; category?: string; bookmakerTier?: string } = {
      isActive: true,
    };
    if (category && category.trim()) enabledWhere.category = category.trim();
    if (bookmakerTier && bookmakerTier.trim()) enabledWhere.bookmakerTier = bookmakerTier.trim();

    const enabledLeagues = await this.enabledLeagueRepo.find({
      where: enabledWhere,
      select: ['apiId', 'country'],
    });
    const enabledApiIds = enabledLeagues.map(l => l.apiId);

    // When country filter is set, use enabled_leagues (source of truth) so Italy/England etc. work even if league.country is null
    let leagueIdsToUse = enabledApiIds;
    if (country && country.trim()) {
      const countryNorm = country.trim().toLowerCase();
      if (countryNorm === 'world') {
        leagueIdsToUse = enabledLeagues
          .filter((el) => !el.country || String(el.country).trim().toLowerCase() === 'world')
          .map((el) => el.apiId);
      } else {
        leagueIdsToUse = enabledLeagues
          .filter((el) => (el.country || '').trim().toLowerCase() === countryNorm)
          .map((el) => el.apiId);
      }
      if (leagueIdsToUse.length === 0) {
        return []; // No enabled leagues for this country
      }
    }

    const enabledLeagueRecords = await this.leagueRepo.find({
      where: { apiId: In(leagueIdsToUse) },
      select: ['id'],
    });
    const enabledLeagueDbIds = enabledLeagueRecords.map(l => l.id);

    const qb = this.fixtureRepo.createQueryBuilder('f')
      .leftJoinAndSelect('f.league', 'league')
      .where("f.status IN ('NS', 'TBD')")
      .andWhere('f.match_date >= :now', { now: new Date() })
      .andWhere(enabledLeagueDbIds.length > 0 ? 'f.league_id IN (:...leagueIds)' : '1=1', {
        leagueIds: enabledLeagueDbIds.length > 0 ? enabledLeagueDbIds : [0],
      });

    if (date) {
      const [y, m, day] = date.split('-').map(Number);
      const start = new Date(Date.UTC(y, m - 1, day, 0, 0, 0, 0));
      const end = new Date(Date.UTC(y, m - 1, day, 23, 59, 59, 999));
      qb.andWhere('f.match_date BETWEEN :start AND :end', { start, end });
    } else {
      // Enforce platform lookahead window (72h by default) even when caller passes larger days.
      const effectiveDays = days && days > 0
        ? Math.min(days, SYNC_LOOKAHEAD_DAYS)
        : SYNC_LOOKAHEAD_DAYS;
      const now = new Date();
      const end = new Date(now.getTime() + effectiveDays * 24 * 60 * 60 * 1000);
      qb.andWhere('f.match_date <= :end', { end });
    }
    if (leagueId) {
      qb.andWhere('f.league_id = :leagueId', { leagueId });
    }
    if (team) {
      // Search in both home and away team names (case-insensitive)
      const teamSearch = `%${team.trim()}%`;
      qb.andWhere(
        '(LOWER(f.homeTeamName) LIKE LOWER(:team) OR LOWER(f.awayTeamName) LIKE LOWER(:team))',
        { team: teamSearch }
      );
    }

    // Default behavior keeps odds-backed fixtures only; admin can request full coverage.
    if (!includeNoOdds) {
      qb.andWhere('EXISTS (SELECT 1 FROM fixture_odds o WHERE o.fixture_id = f.id)');
    }

    const safeLimit = Math.min(Math.max(limit ?? 0, 0), 1000);
    const safeOffset = Math.max(offset ?? 0, 0);
    if (safeLimit > 0) qb.take(safeLimit);
    if (safeOffset > 0) qb.skip(safeOffset);

    const fixtures = await qb.orderBy('f.match_date', 'ASC').getMany();

    // Load odds only when requested (user clicks "Load Odds")
    if (includeOdds && fixtures.length > 0) {
      const ids = fixtures.map((f) => f.id);
      const odds = await this.oddsRepo.find({
        where: { fixtureId: In(ids) },
      });
      const oddsByFixture = new Map<number, typeof odds>();
      for (const o of odds) {
        const list = oddsByFixture.get(o.fixtureId) || [];
        list.push(o);
        oddsByFixture.set(o.fixtureId, list);
      }
      for (const f of fixtures) {
        (f as any).odds = oddsByFixture.get(f.id) || [];
      }
    }

    return fixtures;
  }

  async getById(id: number, loadOdds: boolean = true) {
    const fixture = await this.fixtureRepo.findOne({
      where: { id },
      relations: loadOdds ? ['odds'] : [],
    });
    if (!fixture) return null;

    // Only expose fixtures that have at least one odd (user-facing: no fixtures without odds)
    const hasOdds = fixture.odds && fixture.odds.length > 0;
    if (loadOdds && !hasOdds) {
      await this.oddsSyncService.syncOddsForFixture(id);
      const reloaded = await this.fixtureRepo.findOne({
        where: { id },
        relations: ['odds'],
      });
      if (reloaded && (!reloaded.odds || reloaded.odds.length === 0)) return null;
      return reloaded;
    }
    if (!hasOdds) return null;
    return fixture;
  }

  async getLeagues() {
    // Only return enabled leagues
    const enabledLeagues = await this.enabledLeagueRepo.find({
      where: { isActive: true },
      order: { priority: 'ASC' },
      select: ['apiId'],
    });
    const enabledApiIds = enabledLeagues.map(l => l.apiId);

    return this.leagueRepo.find({
      where: { apiId: In(enabledApiIds) },
      order: { name: 'ASC' },
    });
  }

  /**
   * Public list for league tables / top scorers picker (no secrets).
   * Restricted to enabled leagues with bookmaker_tier = 'core' (reliable odds/data coverage).
   */
  async getLeaguesDirectoryPublic(): Promise<{
    leagues: { apiId: number; name: string; country: string | null; season: number | null }[];
  }> {
    const enabledCore = await this.enabledLeagueRepo.find({
      where: { isActive: true, bookmakerTier: 'core' },
      order: { priority: 'ASC' },
      select: ['apiId'],
    });
    const apiIds = enabledCore.map((l) => l.apiId);
    if (apiIds.length === 0) {
      return { leagues: [] };
    }
    const rows = await this.leagueRepo.find({
      where: { apiId: In(apiIds) },
      order: { name: 'ASC' },
    });
    return {
      leagues: rows.map((l) => ({
        apiId: l.apiId,
        name: l.name,
        country: l.country,
        season: l.season,
      })),
    };
  }

  async getFilterOptions() {
    const enabledLeagues = await this.enabledLeagueRepo.find({
      where: { isActive: true },
      select: ['apiId', 'country', 'category', 'bookmakerTier'],
    });
    const enabledApiIds = enabledLeagues.map(l => l.apiId);

    const leagueRecords = await this.leagueRepo.find({
      where: { apiId: In(enabledApiIds) },
      select: ['id', 'name', 'country', 'apiId'],
      order: { country: 'ASC', name: 'ASC' },
    });

    // Countries that have fixtures with odds in the configured lookahead window.
    const leagueIds = leagueRecords.map((l) => l.id);
    const now = new Date();
    const lookaheadEnd = new Date(now.getTime() + SYNC_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);

    let apiIdsWithFixtures: number[] = [];
    if (leagueIds.length > 0) {
      const rows = await this.fixtureRepo
        .createQueryBuilder('f')
        .innerJoin('fixture_odds', 'o', 'o.fixture_id = f.id')
        .innerJoin('f.league', 'l')
        .where("f.status IN ('NS', 'TBD')")
        .andWhere('f.match_date >= :now', { now })
        .andWhere('f.match_date <= :end', { end: lookaheadEnd })
        .andWhere('f.league_id IN (:...leagueIds)', { leagueIds })
        .select('DISTINCT l.apiId', 'apiId')
        .getRawMany();
      apiIdsWithFixtures = (rows as Record<string, number>[]).map(
        (r) => r.apiId ?? r.api_id ?? r.apiid,
      ).filter((id): id is number => typeof id === 'number');
    }

    const countrySet = new Set<string>();
    if (apiIdsWithFixtures.length > 0) {
      const enabledWithFixtures = await this.enabledLeagueRepo.find({
        where: { apiId: In(apiIdsWithFixtures) },
        select: ['country'],
      });
      enabledWithFixtures.forEach((el) => {
        const c = (el.country || '').trim();
        if (c) countrySet.add(c);
      });
    }
    // No fallback: only show countries that actually have fixtures (avoids USA etc. with 0 fixtures)
    const countries = Array.from(countrySet).sort((a, b) => {
      if ((a || '').toLowerCase() === 'world') return -1;
      if ((b || '').toLowerCase() === 'world') return 1;
      return (a || '').localeCompare(b || '');
    });

    // Only leagues with fixtures (odds) in the configured lookahead window - same as countries
    const apiIdsWithFixturesSet = new Set(apiIdsWithFixtures);
    const leaguesWithFixtures = leagueRecords.filter((l) => apiIdsWithFixturesSet.has(l.apiId));

    // Tournaments for "Filter by tournament": order = International first, then top domestic
    const internationalApiIds = new Set([1, 4, 5, 2, 3, 848]); // World Cup, Euros, Africa Cup, UCL, UEL, UECL
    const tournamentApiIdOrder = [
      1, 4, 5, 2, 3, 848,   // World Cup, Euros, Africa Cup, UCL, UEL, UECL
      39, 140, 135, 78, 61,  // Premier League, La Liga, Serie A, Bundesliga, Ligue 1
      72, 94, 88, 203, 253, 262, 307, 71,  // Championship, Primeira, Eredivisie, Süper Lig, MLS, Liga MX, Saudi, Brazil
      136, 79, 62, 536, 89,  // Serie B, 2. Bundesliga, Ligue 2, LaLiga2, Eerste Divisie
    ];
    const byApiId = new Map(leaguesWithFixtures.map((l) => [l.apiId, l]));
    const tournaments = tournamentApiIdOrder
      .filter((apiId) => byApiId.has(apiId) && apiIdsWithFixturesSet.has(apiId))
      .map((apiId) => {
        const l = byApiId.get(apiId)!;
        return {
          id: l.id,
          name: l.name,
          country: l.country,
          apiId,
          isInternational: internationalApiIds.has(apiId),
        };
      });

    const elByApiId = new Map(enabledLeagues.map(l => [l.apiId, l]));

    return {
      countries,
      categories: [], // Category filter removed for simpler UX
      tournaments,
      leagues: leaguesWithFixtures.map(l => {
        const el = elByApiId.get(l.apiId);
        return {
          id: l.id,
          name: l.name,
          country: l.country ?? el?.country ?? null,
          category: el?.category ?? null,
          bookmakerTier: el?.bookmakerTier ?? null,
        };
      }),
    };
  }

  async runSync() {
    return this.syncService.sync();
  }

  async getSyncDiagnostic() {
    return this.syncService.getSyncDiagnostic();
  }

  /** List enabled leagues for admin (id, apiId, name, country, isActive). */
  async getEnabledLeagues(): Promise<{ id: number; apiId: number; name: string; country: string | null; isActive: boolean }[]> {
    const rows = await this.enabledLeagueRepo.find({
      where: {},
      order: { priority: 'ASC', apiId: 'ASC' },
      select: ['id', 'apiId', 'name', 'country', 'isActive'],
    });
    return rows.map((r) => ({
      id: r.id,
      apiId: r.apiId,
      name: r.name,
      country: r.country ?? null,
      isActive: r.isActive,
    }));
  }

  async enableLeaguesFromApi() {
    return this.syncService.enableLeaguesFromApi();
  }

  /** Remove upcoming fixtures that have no odds (and are not in any coupon). Keeps DB lean. */
  async deleteUpcomingFixturesWithoutOdds(): Promise<number> {
    return this.syncService.deleteUpcomingFixturesWithoutOdds();
  }

  async backfillHomeAwayTeamNames(): Promise<{ fixed: number }> {
    const fixed = await this.syncService.backfillHomeAwayTeamNames();
    return { fixed };
  }

  /** In-play short codes from API-Football (same family as fixture-update live sync). */
  private static readonly PLATFORM_LIVE_STATUSES = ['1H', 'HT', '2H', 'ET', 'P', 'BT'] as const;

  /**
   * Live scores for fixtures already in the platform catalog: enabled leagues + at least one stored odd.
   * Does not list random matches outside the DB. Used by the public Live Scores page.
   *
   * - **live**: in-play statuses (1H, HT, 2H, …)
   * - **upcoming**: NS/TBD with kickoff within `lookaheadDays` (aligned with coupon lookahead window)
   * - **recent**: FT within `archiveHours`
   */
  async getPlatformLiveScores(opts: { archiveHours: number; lookaheadDays?: number }): Promise<{
    live: Record<string, unknown>[];
    upcoming: Record<string, unknown>[];
    recent: Record<string, unknown>[];
    generatedAt: string;
  }> {
    const enabledLeagues = await this.enabledLeagueRepo.find({
      where: { isActive: true },
      select: ['apiId'],
    });
    const enabledApiIds = enabledLeagues.map((l) => l.apiId);
    const leagueRecords = await this.leagueRepo.find({
      where: { apiId: In(enabledApiIds) },
      select: ['id'],
    });
    const leagueDbIds = leagueRecords.map((l) => l.id);
    if (leagueDbIds.length === 0) {
      return { live: [], upcoming: [], recent: [], generatedAt: new Date().toISOString() };
    }

    const lookaheadDays = Math.min(Math.max(opts.lookaheadDays ?? SYNC_LOOKAHEAD_DAYS, 1), 14);
    const now = new Date();
    const archiveCutoff = new Date(now.getTime() - opts.archiveHours * 60 * 60 * 1000);
    const lookaheadEnd = new Date(now.getTime() + lookaheadDays * 24 * 60 * 60 * 1000);
    const liveStatuses = [...FixturesService.PLATFORM_LIVE_STATUSES];

    const baseQb = () =>
      this.fixtureRepo
        .createQueryBuilder('f')
        .leftJoinAndSelect('f.league', 'league')
        .where('f.leagueId IN (:...leagueDbIds)', { leagueDbIds })
        .andWhere('EXISTS (SELECT 1 FROM fixture_odds o WHERE o.fixture_id = f.id)');

    const liveRows = await baseQb()
      .andWhere('f.status IN (:...liveStatuses)', { liveStatuses })
      .orderBy('f.matchDate', 'ASC')
      .getMany();

    const upcomingRows = await baseQb()
      .andWhere("f.status IN ('NS', 'TBD')")
      .andWhere('f.matchDate >= :now', { now })
      .andWhere('f.matchDate <= :lookaheadEnd', { lookaheadEnd })
      .orderBy('f.matchDate', 'ASC')
      .take(200)
      .getMany();

    const recentRows = await baseQb()
      .andWhere("f.status = 'FT'")
      .andWhere('f.matchDate >= :archiveCutoff', { archiveCutoff })
      .orderBy('f.matchDate', 'DESC')
      .take(100)
      .getMany();

    const mapRow = (f: Fixture) => ({
      id: f.id,
      apiId: f.apiId,
      homeTeamName: f.homeTeamName,
      awayTeamName: f.awayTeamName,
      homeTeamLogo: f.homeTeamLogo,
      awayTeamLogo: f.awayTeamLogo,
      leagueName: f.leagueName,
      leagueApiId: f.league?.apiId ?? null,
      country: f.league?.country ?? null,
      matchDate: f.matchDate?.toISOString?.() ?? f.matchDate,
      status: f.status,
      statusElapsed: f.statusElapsed ?? null,
      homeScore: f.homeScore,
      awayScore: f.awayScore,
      htHomeScore: f.htHomeScore ?? null,
      htAwayScore: f.htAwayScore ?? null,
      syncedAt: f.syncedAt?.toISOString?.() ?? f.syncedAt,
    });

    return {
      live: liveRows.map(mapRow),
      upcoming: upcomingRows.map(mapRow),
      recent: recentRows.map(mapRow),
      generatedAt: new Date().toISOString(),
    };
  }
}
