import { pickGreedyLegs, rotateAwayFromRecentRuns } from './acca-generator-pick.util';

function cand(id: number, score: number, outcomeKey = 'over25'): {
  fixtureId: number;
  matchDate: string;
  outcomeKey: string;
  score: number;
} {
  return {
    fixtureId: id,
    matchDate: `2026-08-17T1${id}:00:00.000Z`,
    outcomeKey,
    score,
  };
}

describe('rotateAwayFromRecentRuns', () => {
  const pool = [1, 2, 3, 4, 5, 6, 7, 8].map((id) => cand(id, 1 - id / 100));

  it('drops the newest run when the leftover pool still covers the legs', () => {
    const next = rotateAwayFromRecentRuns(pool, [[1, 2, 3, 4]], 4);
    expect(next.map((c) => c.fixtureId)).toEqual([5, 6, 7, 8]);
  });

  it('peels oldest exclusions first when the leftover pool is too small', () => {
    const tight = [1, 2, 3, 4, 5, 6].map((id) => cand(id, 1 - id / 100));
    const next = rotateAwayFromRecentRuns(tight, [[5, 6], [1, 2, 3, 4]], 4);
    expect(next.map((c) => c.fixtureId).sort()).toEqual([1, 2, 3, 4]);
  });

  it('returns the full pool when even the last run cannot be excluded', () => {
    const tight = [1, 2, 3, 4, 5, 6].map((id) => cand(id, 1 - id / 100));
    const next = rotateAwayFromRecentRuns(tight, [[1, 2, 3, 4, 5, 6]], 4);
    expect(next).toHaveLength(6);
  });
});

describe('pickGreedyLegs', () => {
  const pool = [1, 2, 3, 4, 5, 6, 7, 8].map((id) => cand(id, 1 - id / 100));

  it('picks the same top-N fixtures when vary is off', () => {
    const a = pickGreedyLegs(pool, 4);
    const b = pickGreedyLegs(pool, 4);
    expect(a.map((c) => c.fixtureId).sort()).toEqual(b.map((c) => c.fixtureId).sort());
    expect(a.map((c) => c.fixtureId).sort()).toEqual([1, 2, 3, 4]);
  });

  it('never repeats a fixture', () => {
    const picked = pickGreedyLegs(pool, 6, { vary: true, random: () => 0.99 });
    const ids = picked.map((c) => c.fixtureId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
