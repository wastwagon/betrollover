import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Fixture } from './entities/fixture.entity';
import { FixtureOdd } from './entities/fixture-odd.entity';
import { League } from './entities/league.entity';
import { EnabledLeague } from './entities/enabled-league.entity';
import { MarketFilterService } from './market-filter.service';
import { ApiSettings } from '../admin/entities/api-settings.entity';

const API_BASE = 'https://v3.football.api-sports.io';

@Injectable()
export class OddsSyncService {
  private readonly logger = new Logger(OddsSyncService.name);

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

  /**
   * Sync odds for fixtures from enabled leagues only
   * Filters markets by Tier 1 + Tier 2 configuration
   */
  async syncOddsForFixtures(fixtureIds: number[]): Promise<{ synced: number; errors: number }> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      this.logger.warn('API key not configured');
      return { synced: 0, errors: 0 };
    }

    // Load market configs
    await this.marketFilterService.loadMarketConfigs();

    const headers = { 'x-apisports-key': apiKey };
    let synced = 0;
    let errors = 0;

    // Get fixtures with their API IDs
    const fixtures = await this.fixtureRepo.find({
      where: { id: In(fixtureIds) },
      select: ['id', 'apiId'],
    });

    for (const fixture of fixtures) {
      try {
        // Fetch odds from API
        const res = await fetch(`${API_BASE}/odds?fixture=${fixture.apiId}`, { headers });
        
        if (!res.ok) {
          this.logger.warn(`Failed to fetch odds for fixture ${fixture.apiId}: ${res.status}`);
          errors++;
          continue;
        }

        const data = await res.json();
        
        // Check if API returned data
        if (!data?.response || data.response.length === 0) {
          this.logger.warn(`No odds data returned from API for fixture ${fixture.apiId}`);
          errors++;
          continue;
        }
        
        // Filter markets using MarketFilterService
        const filteredOdds = this.marketFilterService.filterOddsFromApiResponse(data);

        if (filteredOdds.length === 0) {
          this.logger.warn(`No odds passed market filter for fixture ${fixture.apiId}. API returned ${data.response[0]?.bookmakers?.length || 0} bookmakers`);
          errors++;
          continue;
        }

        // Delete existing odds for this fixture
        await this.oddsRepo.delete({ fixtureId: fixture.id });

        // Save filtered odds (no bookmaker stored, just market + value + odds)
        for (const odd of filteredOdds) {
          await this.oddsRepo.save({
            fixtureId: fixture.id,
            marketName: odd.marketName,
            marketValue: odd.marketValue,
            odds: odd.odds,
            bookmaker: null, // Don't store bookmaker
            syncedAt: new Date(),
          });
        }

        synced++;
        this.logger.log(`Synced ${filteredOdds.length} odds for fixture ${fixture.apiId} (${filteredOdds.map(o => o.marketName).filter((v, i, a) => a.indexOf(v) === i).join(', ')})`);
      } catch (error: any) {
        this.logger.error(`Error syncing odds for fixture ${fixture.id}:`, error);
        errors++;
      }
    }

    return { synced, errors };
  }

  /**
   * Sync odds for fixtures from enabled leagues (on-demand)
   * Called when user selects a fixture
   */
  async syncOddsForFixture(fixtureId: number): Promise<FixtureOdd[]> {
    const result = await this.syncOddsForFixtures([fixtureId]);
    if (result.synced > 0) {
      return this.oddsRepo.find({ where: { fixtureId } });
    }
    return [];
  }

  /**
   * Odds-first sync: fetch odds by date, only persist fixtures that have Tier 1/2 odds.
   * Saves API credits by never storing fixtures without odds.
   * Uses GET /odds?date=X (1 call per date) instead of fixtures + N odds calls.
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

    for (const date of dates) {
      try {
        const res = await fetch(`${API_BASE}/odds?date=${date}`, { headers });
        if (!res.ok) {
          this.logger.warn(`Odds by date ${date}: ${res.status}`);
          continue;
        }
        const data = await res.json();
        const items = data?.response || [];
        if (items.length === 0) continue;

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

          await this.fixtureRepo.upsert(
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
              syncedAt: new Date(),
            },
            ['apiId'],
          );

          const fixtureEntity = await this.fixtureRepo.findOne({ where: { apiId: fix.id }, select: ['id'] });
          const fixtureDbId = fixtureEntity?.id;
          if (!fixtureDbId) continue;

          await this.oddsRepo.delete({ fixtureId: fixtureDbId });
          for (const odd of filteredOdds) {
            await this.oddsRepo.save({
              fixtureId: fixtureDbId,
              marketName: odd.marketName,
              marketValue: odd.marketValue,
              odds: odd.odds,
              bookmaker: null,
              syncedAt: new Date(),
            });
            oddsStored++;
          }
          fixturesStored++;
        }
      } catch (err: any) {
        this.logger.error(`Odds-first sync for date ${date}:`, err);
      }
    }

    this.logger.log(`Odds-first sync: ${fixturesStored} fixtures, ${oddsStored} odds, ${skipped} skipped (no Tier 1/2 odds or disabled league)`);
    return { fixtures: fixturesStored, odds: oddsStored, skipped };
  }
}
