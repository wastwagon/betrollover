/** Row shape from GET /fixtures/platform/headline-matches */
export interface MatchSpotlightPlayer {
  playerName: string;
  playerPhoto: string | null;
  teamName: string;
  goals: number | null;
}

export interface TodayMatchRow {
  id: number;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
  leagueName: string | null;
  leagueApiId?: number | null;
  matchDate: string;
  status: string;
  statusElapsed?: number | null;
  homeScore: number | null;
  awayScore: number | null;
  spotlightPlayer?: MatchSpotlightPlayer | null;
}

const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN', 'CANC', 'PST', 'ABD', 'AWD', 'WO']);
const NOT_STARTED_STATUSES = new Set(['NS', 'TBD']);

export function isFixtureLive(status: string): boolean {
  const s = status.trim().toUpperCase();
  return !FINISHED_STATUSES.has(s) && !NOT_STARTED_STATUSES.has(s);
}

export function parseTodayMatchRow(raw: unknown): TodayMatchRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = Number(o.id);
  if (!Number.isFinite(id)) return null;

  let spotlightPlayer: MatchSpotlightPlayer | null = null;
  const sp = o.spotlightPlayer;
  if (sp && typeof sp === 'object') {
    const p = sp as Record<string, unknown>;
    if (p.playerName) {
      spotlightPlayer = {
        playerName: String(p.playerName),
        playerPhoto: p.playerPhoto != null ? String(p.playerPhoto) : null,
        teamName: String(p.teamName ?? ''),
        goals: p.goals != null ? Number(p.goals) : null,
      };
    }
  }

  return {
    id,
    homeTeamName: String(o.homeTeamName ?? 'Home'),
    awayTeamName: String(o.awayTeamName ?? 'Away'),
    homeTeamLogo: o.homeTeamLogo != null ? String(o.homeTeamLogo) : null,
    awayTeamLogo: o.awayTeamLogo != null ? String(o.awayTeamLogo) : null,
    leagueName: o.leagueName != null ? String(o.leagueName) : null,
    leagueApiId: o.leagueApiId != null ? Number(o.leagueApiId) : null,
    matchDate: String(o.matchDate ?? ''),
    status: String(o.status ?? 'NS'),
    statusElapsed: o.statusElapsed != null ? Number(o.statusElapsed) : null,
    homeScore: o.homeScore != null ? Number(o.homeScore) : null,
    awayScore: o.awayScore != null ? Number(o.awayScore) : null,
    spotlightPlayer,
  };
}

export function parseHeadlineMatchesPayload(data: unknown): TodayMatchRow[] {
  if (!data || typeof data !== 'object') return [];
  const matches = (data as { matches?: unknown[] }).matches;
  if (!Array.isArray(matches)) return [];
  return matches
    .map(parseTodayMatchRow)
    .filter((m): m is TodayMatchRow => m != null);
}

/** Count marketplace coupons that reference either team in a leg description. */
export function countPicksForMatch(
  match: TodayMatchRow,
  items: Record<string, unknown>[],
): number {
  const home = match.homeTeamName.toLowerCase();
  const away = match.awayTeamName.toLowerCase();
  let count = 0;
  for (const item of items) {
    const picks = (item as { picks?: { matchDescription?: string }[] }).picks;
    if (!Array.isArray(picks)) continue;
    const hit = picks.some((p) => {
      const desc = (p.matchDescription || '').toLowerCase();
      return desc.includes(home) || desc.includes(away);
    });
    if (hit) count++;
  }
  return count;
}
