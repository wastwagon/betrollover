/** Half-time scores from API-Football fixture payload (`score.halftime`). */
export function extractHalftimeScores(apiItem: {
  score?: { halftime?: { home?: number | null; away?: number | null } };
}): { htHomeScore: number | null; htAwayScore: number | null } {
  const ht = apiItem?.score?.halftime;
  if (ht && typeof ht.home === 'number' && typeof ht.away === 'number') {
    return { htHomeScore: ht.home, htAwayScore: ht.away };
  }
  return { htHomeScore: null, htAwayScore: null };
}

/**
 * Full-time scores: prefer `goals`, fall back to `score.fulltime`
 * (some finished payloads omit goals briefly).
 */
export function extractFulltimeScores(apiItem: {
  goals?: { home?: number | null; away?: number | null };
  score?: { fulltime?: { home?: number | null; away?: number | null } };
}): { homeScore: number | null; awayScore: number | null } {
  const goals = apiItem?.goals;
  if (goals && typeof goals.home === 'number' && typeof goals.away === 'number') {
    return { homeScore: goals.home, awayScore: goals.away };
  }
  const ft = apiItem?.score?.fulltime;
  if (ft && typeof ft.home === 'number' && typeof ft.away === 'number') {
    return { homeScore: ft.home, awayScore: ft.away };
  }
  return { homeScore: null, awayScore: null };
}
