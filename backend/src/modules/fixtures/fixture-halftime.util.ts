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
