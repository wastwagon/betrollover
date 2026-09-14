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
  const band = { minCombined: 1.5, maxCombined: 1.99, maxGapMs };

  it('pairs two 1.28 homes inside 1.50–1.99', () => {
    const pair = pickVipFoldPair([c(1, 1.28, 18), c(2, 1.28, 19), c(3, 1.28, 23)], band);
    expect(pair.map((p) => p.fixtureId)).toEqual([1, 2]);
  });

  it('skips two 1.20s under the 1.50 combined floor', () => {
    const pair = pickVipFoldPair([c(1, 1.2, 18), c(2, 1.2, 19)], band);
    expect(pair).toEqual([]);
  });

  it('rejects two legs in a blocked same-league pair', () => {
    const pair = pickVipFoldPair(
      [c(1, 1.28, 18, 2, 365), c(2, 1.28, 19, 2, 365), c(3, 1.28, 19, 1, 71)],
      {
        ...band,
        rejectSameLeagueApiIds: [365],
      },
    );
    expect(pair.map((p) => p.fixtureId).sort()).toEqual([2, 3]);
  });

  it('skips kick-offs farther than maxGapMs', () => {
    const pair = pickVipFoldPair([c(1, 1.28, 12), c(2, 1.28, 20)], band);
    expect(pair).toEqual([]);
  });
});
