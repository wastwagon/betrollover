import { pickVipFoldPair } from './vip-tipster.pair';

function c(id: number, odds: number, hour: number, score = 1, leagueApiId = 71) {
  return {
    fixtureId: id,
    odds,
    score,
    leagueApiId,
    matchDate: `2026-09-13T${String(hour).padStart(2, '0')}:00:00.000Z`,
  };
}

describe('pickVipFoldPair', () => {
  const maxGapMs = 3 * 60 * 60 * 1000;

  it('pairs two 1.55 legs inside 2.20–2.80', () => {
    const pair = pickVipFoldPair([c(1, 1.55, 18), c(2, 1.55, 19), c(3, 1.55, 23)], {
      minCombined: 2.2,
      maxCombined: 2.8,
      maxGapMs,
    });
    expect(pair.map((p) => p.fixtureId)).toEqual([1, 2]);
  });

  it('rejects two Championship legs', () => {
    const pair = pickVipFoldPair(
      [c(1, 1.55, 18, 2, 40), c(2, 1.55, 19, 2, 40), c(3, 1.55, 19, 1, 71)],
      {
        minCombined: 2.2,
        maxCombined: 2.8,
        maxGapMs,
        rejectSameLeagueApiIds: [40],
      },
    );
    expect(pair.map((p) => p.fixtureId).sort()).toEqual([2, 3]);
  });

  it('skips pairs outside the combined band', () => {
    const pair = pickVipFoldPair([c(1, 1.2, 18), c(2, 1.2, 19)], {
      minCombined: 2.2,
      maxCombined: 2.8,
      maxGapMs,
    });
    expect(pair).toEqual([]);
  });

  it('skips kick-offs farther than maxGapMs', () => {
    const pair = pickVipFoldPair([c(1, 1.55, 12), c(2, 1.55, 20)], {
      minCombined: 2.2,
      maxCombined: 2.8,
      maxGapMs,
    });
    expect(pair).toEqual([]);
  });
});
