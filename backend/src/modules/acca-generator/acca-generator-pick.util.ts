import { outcomeFamily } from './acca-generator.markets';

export type AccaPickCandidate = {
  fixtureId: number;
  matchDate: string;
  outcomeKey: string;
  score?: number;
};

/**
 * Prefer a fresh same-day slip: drop fixtures from the user's newest runs first.
 * If that leaves too few legs, peel off the oldest excluded run until the pool is large enough.
 */
export function rotateAwayFromRecentRuns<T extends { fixtureId: number }>(
  all: T[],
  recentStacksNewestFirst: number[][],
  legs: number,
): T[] {
  if (all.length < legs || recentStacksNewestFirst.length === 0) return all;
  const stacks = recentStacksNewestFirst.map((stack) => [...stack]);
  while (true) {
    const exclude = new Set(stacks.flat());
    const filtered = exclude.size ? all.filter((c) => !exclude.has(c.fixtureId)) : all;
    if (filtered.length >= legs) return filtered;
    if (!stacks.length) return all;
    stacks.pop();
  }
}

export function pickGreedyLegs<T extends AccaPickCandidate>(
  candidates: T[],
  legs: number,
  opts?: { vary?: boolean; random?: () => number },
): T[] {
  const vary = opts?.vary === true;
  const random = opts?.random ?? Math.random;
  const familyCounts = new Map<string, number>();
  const selected: T[] = [];
  let remaining = [...candidates];
  const windowSize = vary ? Math.max(8, legs * 2) : 1;

  while (selected.length < legs && remaining.length) {
    const ranked = remaining
      .map((c) => {
        const family = outcomeFamily(c.outcomeKey);
        const adj = (c.score ?? 0) - (familyCounts.get(family) ?? 0) * 0.12;
        return { c, adj };
      })
      .sort((a, b) => b.adj - a.adj || (b.c.score ?? 0) - (a.c.score ?? 0));

    if (!ranked.length) break;

    const window = ranked.slice(0, Math.min(windowSize, ranked.length));
    const pickIdx = vary ? weightedIndex(window.map((_, i) => window.length - i), random) : 0;
    const pick = window[pickIdx].c;

    remaining = remaining.filter((c) => c.fixtureId !== pick.fixtureId);
    const family = outcomeFamily(pick.outcomeKey);
    familyCounts.set(family, (familyCounts.get(family) ?? 0) + 1);
    selected.push(pick);
  }

  selected.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
  return selected;
}

function weightedIndex(weights: number[], random: () => number): number {
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return 0;
  let r = random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}
