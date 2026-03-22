import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeagueInsightCache } from './entities/league-insight-cache.entity';
import { League } from './entities/league.entity';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { getSportApiBaseUrl } from '../../config/sports.config';
import { API_CALL_DELAY_MS } from '../../config/api-limits.config';
import { safeJson } from '../../common/fetch-json.util';

const CACHE_TTL_MS = 45 * 60 * 1000;
const TOP_SCORER_LIMIT = 18;

export interface StandingsTableRow {
  rank: number;
  teamName: string;
  teamLogo: string | null;
  points: number;
  played: number;
  win: number;
  draw: number;
  loss: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsDiff: number | null;
}

export interface StandingsGroup {
  group: string | null;
  table: StandingsTableRow[];
}

export interface TopScorerRow {
  rank: number;
  playerName: string;
  playerPhoto: string | null;
  teamName: string;
  goals: number | null;
  assists: number | null;
}

export interface LeagueInsightsDto {
  leagueApiId: number;
  season: number;
  leagueName: string | null;
  country: string | null;
  standings: StandingsGroup[];
  topScorers: TopScorerRow[];
  cachedAt: string;
  fromCache: boolean;
  error?: string;
}

interface CachedStandingsPayload {
  groups: StandingsGroup[];
  leagueName?: string | null;
  country?: string | null;
}

interface CachedScorersPayload {
  rows: TopScorerRow[];
}

@Injectable()
export class LeagueInsightsService {
  private readonly logger = new Logger(LeagueInsightsService.name);

  constructor(
    @InjectRepository(LeagueInsightCache)
    private readonly cacheRepo: Repository<LeagueInsightCache>,
    @InjectRepository(League)
    private readonly leagueRepo: Repository<League>,
    @InjectRepository(ApiSettings)
    private readonly apiSettingsRepo: Repository<ApiSettings>,
  ) {}

  private async getApiKey(): Promise<string> {
    try {
      const apiSettings = await this.apiSettingsRepo.findOne({
        where: { id: 1 },
        select: ['apiSportsKey'],
      });
      return apiSettings?.apiSportsKey || process.env.API_SPORTS_KEY || '';
    } catch {
      return process.env.API_SPORTS_KEY || '';
    }
  }

  private isFresh(fetchedAt: Date): boolean {
    return Date.now() - new Date(fetchedAt).getTime() < CACHE_TTL_MS;
  }

  async resolveSeason(leagueApiId: number, seasonQuery?: string): Promise<number | null> {
    const parsed = seasonQuery != null && seasonQuery !== '' ? parseInt(seasonQuery, 10) : NaN;
    if (!Number.isNaN(parsed) && parsed > 1990) return parsed;

    const row = await this.leagueRepo.findOne({
      where: { apiId: leagueApiId },
      select: ['season'],
    });
    if (row?.season != null && row.season > 1990) return row.season;

    const key = await this.getApiKey();
    if (!key) return null;

    try {
      const base = getSportApiBaseUrl('football');
      const res = await fetch(`${base}/leagues?id=${leagueApiId}`, {
        headers: { 'x-apisports-key': key },
      });
      if (!res.ok) return null;
      const data = await safeJson<{ response?: Array<{ seasons?: Array<{ year?: number; coverage?: unknown }> }> }>(res);
      const seasons = data?.response?.[0]?.seasons;
      if (!seasons?.length) return null;
      const withCoverage = seasons.filter((s) => s?.year && s.coverage);
      const pick = (withCoverage.length ? withCoverage : seasons).sort((a, b) => (b.year ?? 0) - (a.year ?? 0))[0];
      return pick?.year ?? null;
    } catch (e: any) {
      this.logger.warn(`resolveSeason API failed for league ${leagueApiId}: ${e?.message}`);
      return null;
    }
  }

  private parseStandingsResponse(raw: unknown): { groups: StandingsGroup[]; leagueName: string | null; country: string | null } {
    const r = raw as {
      response?: Array<{
        league?: { name?: string; country?: string };
        standings?: Array<{ group?: string | null; table?: unknown[] }>;
      }>;
    };
    const block = r?.response?.[0];
    const leagueName = block?.league?.name ?? null;
    const country = block?.league?.country ?? null;
    const groups: StandingsGroup[] = [];
    for (const s of block?.standings ?? []) {
      const table: StandingsTableRow[] = [];
      for (const row of s?.table ?? []) {
        const tr = row as Record<string, unknown>;
        const team = tr.team as Record<string, unknown> | undefined;
        const all = tr.all as Record<string, unknown> | undefined;
        const goals = tr.goals as Record<string, unknown> | undefined;
        const played = Number(all?.played ?? 0);
        const win = Number(all?.win ?? 0);
        const draw = Number(all?.draw ?? 0);
        const loss = Number(all?.lose ?? all?.loss ?? 0);
        const gf = Number(goals?.for ?? 0);
        const ga = Number(goals?.against ?? 0);
        table.push({
          rank: Number(tr.rank ?? table.length + 1),
          teamName: String(team?.name ?? '—'),
          teamLogo: team?.logo != null ? String(team.logo) : null,
          points: Number(tr.points ?? 0),
          played,
          win,
          draw,
          loss,
          goalsFor: gf,
          goalsAgainst: ga,
          goalsDiff: tr.goalsDiff != null ? Number(tr.goalsDiff) : gf - ga,
        });
      }
      groups.push({ group: s?.group != null && s.group !== 'null' ? String(s.group) : null, table });
    }
    return { groups, leagueName, country };
  }

  private parseTopScorersResponse(raw: unknown): TopScorerRow[] {
    const r = raw as {
      response?: Array<{
        player?: { name?: string; photo?: string };
        statistics?: Array<{
          team?: { name?: string };
          goals?: { total?: number | string | null; assists?: number | string | null };
        }>;
      }>;
    };
    const rows: TopScorerRow[] = [];
    let rank = 1;
    for (const item of r?.response ?? []) {
      if (rows.length >= TOP_SCORER_LIMIT) break;
      const st = item?.statistics?.[0];
      const gRaw = st?.goals?.total;
      const goals = gRaw === null || gRaw === undefined ? null : Number(gRaw);
      const aRaw = st?.goals?.assists;
      const assists = aRaw === null || aRaw === undefined ? null : Number(aRaw);
      rows.push({
        rank: rank++,
        playerName: String(item?.player?.name ?? '—'),
        playerPhoto: item?.player?.photo != null ? String(item.player.photo) : null,
        teamName: String(st?.team?.name ?? '—'),
        goals: Number.isFinite(goals as number) ? (goals as number) : null,
        assists: assists != null && Number.isFinite(assists) ? assists : null,
      });
    }
    return rows;
  }

  private async fetchStandingsFromApi(leagueApiId: number, season: number, apiKey: string): Promise<CachedStandingsPayload> {
    const base = getSportApiBaseUrl('football');
    const res = await fetch(`${base}/standings?league=${leagueApiId}&season=${season}`, {
      headers: { 'x-apisports-key': apiKey },
    });
    if (!res.ok) {
      throw new Error(`standings HTTP ${res.status}`);
    }
    const json = await safeJson(res);
    const parsed = this.parseStandingsResponse(json);
    return {
      groups: parsed.groups,
      leagueName: parsed.leagueName,
      country: parsed.country,
    };
  }

  private async fetchTopScorersFromApi(leagueApiId: number, season: number, apiKey: string): Promise<CachedScorersPayload> {
    const base = getSportApiBaseUrl('football');
    const res = await fetch(`${base}/players/topscorers?league=${leagueApiId}&season=${season}`, {
      headers: { 'x-apisports-key': apiKey },
    });
    if (!res.ok) {
      throw new Error(`topscorers HTTP ${res.status}`);
    }
    const json = await safeJson(res);
    return { rows: this.parseTopScorersResponse(json) };
  }

  async getInsights(leagueApiId: number, seasonQuery?: string): Promise<LeagueInsightsDto> {
    const season = await this.resolveSeason(leagueApiId, seasonQuery);
    if (season == null) {
      return {
        leagueApiId,
        season: new Date().getFullYear(),
        leagueName: null,
        country: null,
        standings: [],
        topScorers: [],
        cachedAt: new Date().toISOString(),
        fromCache: false,
        error: 'Could not resolve season for this league. Try ?season=YYYY.',
      };
    }

    const [standRow, scoreRow] = await Promise.all([
      this.cacheRepo.findOne({ where: { leagueApiId, season, kind: 'standings' } }),
      this.cacheRepo.findOne({ where: { leagueApiId, season, kind: 'topscorers' } }),
    ]);

    const apiKey = await this.getApiKey();
    if (!apiKey && (!standRow || !scoreRow)) {
      return {
        leagueApiId,
        season,
        leagueName: null,
        country: null,
        standings: [],
        topScorers: [],
        cachedAt: new Date().toISOString(),
        fromCache: false,
        error: 'API key not configured.',
      };
    }

    let networkUsed = false;
    let standingsPayload: CachedStandingsPayload;
    let scorersPayload: CachedScorersPayload;
    let fetchError: string | undefined;

    const needStandings = !standRow || !this.isFresh(standRow.fetchedAt);
    const needScorers = !scoreRow || !this.isFresh(scoreRow.fetchedAt);

    if (!needStandings && standRow) {
      standingsPayload = (standRow.payload as unknown as CachedStandingsPayload) ?? { groups: [] };
    } else if (apiKey) {
      try {
        standingsPayload = await this.fetchStandingsFromApi(leagueApiId, season, apiKey);
        networkUsed = true;
        await this.cacheRepo.upsert(
          {
            leagueApiId,
            season,
            kind: 'standings',
            payload: standingsPayload,
            fetchedAt: new Date(),
          },
          { conflictPaths: ['leagueApiId', 'season', 'kind'] },
        );
      } catch (e: any) {
        this.logger.warn(`standings fetch failed league=${leagueApiId}: ${e?.message}`);
        fetchError = e?.message;
        standingsPayload = standRow
          ? ((standRow.payload as unknown as CachedStandingsPayload) ?? { groups: [] })
          : { groups: [] };
      }
    } else {
      standingsPayload = standRow
        ? ((standRow.payload as unknown as CachedStandingsPayload) ?? { groups: [] })
        : { groups: [] };
    }

    if (!needScorers && scoreRow) {
      scorersPayload = (scoreRow.payload as unknown as CachedScorersPayload) ?? { rows: [] };
    } else if (apiKey) {
      try {
        await new Promise((r) => setTimeout(r, API_CALL_DELAY_MS));
        scorersPayload = await this.fetchTopScorersFromApi(leagueApiId, season, apiKey);
        networkUsed = true;
        await this.cacheRepo.upsert(
          {
            leagueApiId,
            season,
            kind: 'topscorers',
            payload: scorersPayload,
            fetchedAt: new Date(),
          },
          { conflictPaths: ['leagueApiId', 'season', 'kind'] },
        );
      } catch (e: any) {
        this.logger.warn(`topscorers fetch failed league=${leagueApiId}: ${e?.message}`);
        fetchError = fetchError ?? e?.message;
        scorersPayload = scoreRow
          ? ((scoreRow.payload as unknown as CachedScorersPayload) ?? { rows: [] })
          : { rows: [] };
      }
    } else {
      scorersPayload = scoreRow
        ? ((scoreRow.payload as unknown as CachedScorersPayload) ?? { rows: [] })
        : { rows: [] };
    }

    const metaName = standingsPayload.leagueName ?? null;
    const metaCountry = standingsPayload.country ?? null;
    const fromCache = !networkUsed;

    const dbLeague = await this.leagueRepo.findOne({
      where: { apiId: leagueApiId },
      select: ['name', 'country'],
    });

    const hasStandingsData = (standingsPayload.groups ?? []).some((g) => g.table.length > 0);
    const hasScorersData = (scorersPayload.rows ?? []).length > 0;

    return {
      leagueApiId,
      season,
      leagueName: metaName ?? dbLeague?.name ?? null,
      country: metaCountry ?? dbLeague?.country ?? null,
      standings: standingsPayload.groups ?? [],
      topScorers: scorersPayload.rows ?? [],
      cachedAt: new Date().toISOString(),
      fromCache,
      ...(fetchError && !hasStandingsData && !hasScorersData ? { error: fetchError } : {}),
    };
  }
}
