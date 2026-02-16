import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Fixture } from './entities/fixture.entity';
import { FixtureOdd } from './entities/fixture-odd.entity';
import { League } from './entities/league.entity';
import { EnabledLeague } from './entities/enabled-league.entity';
import { FootballSyncService } from './football-sync.service';
import { OddsSyncService } from './odds-sync.service';

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
    } else if (days && days > 0) {
      const now = new Date();
      const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
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

    // Only show fixtures that have at least one odd (Tier 1/Tier 2) - avoid fixtures with no odds
    qb.andWhere('EXISTS (SELECT 1 FROM fixture_odds o WHERE o.fixture_id = f.id)');

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

    // If odds not loaded and fixture exists, sync odds on-demand
    if (fixture && loadOdds && (!fixture.odds || fixture.odds.length === 0)) {
      await this.oddsSyncService.syncOddsForFixture(id);
      // Reload with odds
      return this.fixtureRepo.findOne({
        where: { id },
        relations: ['odds'],
      });
    }

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

    // Countries that have fixtures with odds in the next 7 days (use enabled_leagues.country to match list() filtering)
    const leagueIds = leagueRecords.map((l) => l.id);
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let apiIdsWithFixtures: number[] = [];
    if (leagueIds.length > 0) {
      const rows = await this.fixtureRepo
        .createQueryBuilder('f')
        .innerJoin('fixture_odds', 'o', 'o.fixture_id = f.id')
        .innerJoin('f.league', 'l')
        .where("f.status IN ('NS', 'TBD')")
        .andWhere('f.match_date >= :now', { now })
        .andWhere('f.match_date <= :end', { end: sevenDaysLater })
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

    // Only leagues with fixtures (odds) in next 7 days - same as countries
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

  async backfillHomeAwayTeamNames(): Promise<{ fixed: number }> {
    const fixed = await this.syncService.backfillHomeAwayTeamNames();
    return { fixed };
  }
}
