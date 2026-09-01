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

const BIG_LEAGUE_HINTS = [
  'champions league',
  'premier league',
  'la liga',
  'serie a',
  'bundesliga',
  'ligue 1',
  'europa league',
  'conference league',
  'fa cup',
  'copa del rey',
  'dfb-pokal',
  'world cup',
];

export function isFixtureLive(status: string): boolean {
  const s = status.trim().toUpperCase();
  return !FINISHED_STATUSES.has(s) && !NOT_STARTED_STATUSES.has(s);
}

function leagueBoost(leagueName: string | null): number {
  const n = (leagueName || '').toLowerCase();
  for (let i = 0; i < BIG_LEAGUE_HINTS.length; i++) {
    if (n.includes(BIG_LEAGUE_HINTS[i])) return BIG_LEAGUE_HINTS.length - i;
  }
  return 0;
}

function matchScore(m: TodayMatchRow, now: number): number {
  const liveBonus = isFixtureLive(m.status) ? 1000 : 0;
  const kickoff = new Date(m.matchDate).getTime();
  const hoursUntil = (kickoff - now) / (60 * 60 * 1000);
  const soonBonus =
    hoursUntil >= 0 && hoursUntil <= 36 ? Math.max(0, 400 - hoursUntil * 12) : 0;
  return liveBonus + leagueBoost(m.leagueName) * 40 + soonBonus;
}

/** Pick headline fixtures for the home carousel (live first, then big leagues kicking off soon). */
export function pickHeadlineMatches(
  live: TodayMatchRow[],
  upcoming: TodayMatchRow[],
  limit = 8,
): TodayMatchRow[] {
  const now = Date.now();
  const horizon = now + 36 * 60 * 60 * 1000;
  const pool: TodayMatchRow[] = [...live];

  for (const row of upcoming) {
    const kickoff = new Date(row.matchDate).getTime();
    if (kickoff <= horizon) pool.push(row);
  }

  const seen = new Set<number>();
  const unique = pool.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });

  const ranked = unique.sort((a, b) => {
    const diff = matchScore(b, now) - matchScore(a, now);
    if (diff !== 0) return diff;
    return new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime();
  });
  return takeHeadlineSlice(ranked, limit);
}

function takeHeadlineSlice<T extends { id: number; status: string; leagueName: string | null }>(
  ranked: T[],
  limit: number,
): T[] {
  const preferred = ranked.filter((m) => isFixtureLive(m.status) || leagueBoost(m.leagueName) > 0);
  if (preferred.length >= limit) return preferred.slice(0, limit);
  const preferredIds = new Set(preferred.map((m) => m.id));
  const fill = ranked.filter((m) => !preferredIds.has(m.id));
  return [...preferred, ...fill].slice(0, limit);
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
