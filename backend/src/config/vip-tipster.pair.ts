export type VipPairCandidate = {
  fixtureId: number;
  matchDate: string;
  odds: number;
  score?: number;
  leagueApiId?: number | null;
};

function productOdds(a: number, b: number): number {
  const product = a * b;
  if (!Number.isFinite(product) || product <= 0) return 1;
  return Math.round(product * 1000) / 1000;
}

function bothInRejectedLeague(
  a: VipPairCandidate,
  b: VipPairCandidate,
  rejectSameLeagueApiIds: readonly number[],
): boolean {
  if (!rejectSameLeagueApiIds.length) return false;
  const idA = a.leagueApiId;
  const idB = b.leagueApiId;
  if (idA == null || idB == null) return false;
  return idA === idB && rejectSameLeagueApiIds.includes(idA);
}

/**
 * Best 2-fold in combined-odds range, kick-offs clustered, no rejected same-league pair.
 */
export function pickVipFoldPair<T extends VipPairCandidate>(
  candidates: T[],
  opts: {
    minCombined: number;
    maxCombined: number;
    maxGapMs: number;
    rejectSameLeagueApiIds?: readonly number[];
  },
): T[] {
  if (candidates.length < 2) return [];
  const reject = opts.rejectSameLeagueApiIds ?? [];
  const sorted = [...candidates].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  let best: T[] = [];
  let bestScore = -Infinity;
  let bestGap = Infinity;

  for (let i = 0; i < sorted.length; i++) {
    const first = sorted[i];
    const t1 = new Date(first.matchDate).getTime();
    if (!Number.isFinite(t1)) continue;

    for (let j = i + 1; j < sorted.length; j++) {
      const other = sorted[j];
      if (other.fixtureId === first.fixtureId) continue;
      const t2 = new Date(other.matchDate).getTime();
      if (!Number.isFinite(t2)) continue;
      const gap = Math.abs(t2 - t1);
      if (gap > opts.maxGapMs) continue;
      if (bothInRejectedLeague(first, other, reject)) continue;
      const combined = productOdds(first.odds, other.odds);
      if (combined < opts.minCombined || combined > opts.maxCombined) continue;

      const pairScore = (first.score ?? 0) + (other.score ?? 0);
      if (pairScore > bestScore || (pairScore === bestScore && gap < bestGap)) {
        best = [first, other];
        bestScore = pairScore;
        bestGap = gap;
      }
    }
  }

  if (best.length !== 2) return [];
  return [...best].sort(
    (a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime(),
  );
}
