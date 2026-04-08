import { extractHalftimeScores } from './fixture-halftime.util';

describe('extractHalftimeScores', () => {
  it('reads API-Football score.halftime', () => {
    expect(extractHalftimeScores({ score: { halftime: { home: 1, away: 0 } } })).toEqual({
      htHomeScore: 1,
      htAwayScore: 0,
    });
  });

  it('returns nulls when missing', () => {
    expect(extractHalftimeScores({ score: {} })).toEqual({ htHomeScore: null, htAwayScore: null });
    expect(extractHalftimeScores({})).toEqual({ htHomeScore: null, htAwayScore: null });
  });
});
