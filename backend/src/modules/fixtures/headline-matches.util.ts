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

export interface HeadlineMatchRow {
  id: number;
  apiId: number;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
  leagueName: string | null;
  leagueApiId: number | null;
  matchDate: string;
  status: string;
  statusElapsed: number | null;
  homeScore: number | null;
  awayScore: number | null;
}

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

function matchScore(m: HeadlineMatchRow, now: number): number {
  const liveBonus = isFixtureLive(m.status) ? 1000 : 0;
  const kickoff = new Date(m.matchDate).getTime();
  const hoursUntil = (kickoff - now) / (60 * 60 * 1000);
  const soonBonus =
    hoursUntil >= 0 && hoursUntil <= 36 ? Math.max(0, 400 - hoursUntil * 12) : 0;
  return liveBonus + leagueBoost(m.leagueName) * 40 + soonBonus;
}

export function pickHeadlineMatches(
  live: HeadlineMatchRow[],
  upcoming: HeadlineMatchRow[],
  limit = 8,
): HeadlineMatchRow[] {
  const now = Date.now();
  const horizon = now + 36 * 60 * 60 * 1000;
  const pool: HeadlineMatchRow[] = [...live];

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

  return unique
    .sort((a, b) => {
      const diff = matchScore(b, now) - matchScore(a, now);
      if (diff !== 0) return diff;
      return new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime();
    })
    .slice(0, limit);
}
