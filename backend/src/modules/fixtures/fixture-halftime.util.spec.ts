import { extractFulltimeScores, extractHalftimeScores } from './fixture-halftime.util';

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

describe('extractFulltimeScores', () => {
  it('prefers goals over fulltime', () => {
    expect(
      extractFulltimeScores({
        goals: { home: 2, away: 1 },
        score: { fulltime: { home: 9, away: 9 } },
      }),
    ).toEqual({ homeScore: 2, awayScore: 1 });
  });

  it('falls back to score.fulltime', () => {
    expect(
      extractFulltimeScores({
        goals: { home: null, away: null },
        score: { fulltime: { home: 1, away: 0 } },
      }),
    ).toEqual({ homeScore: 1, awayScore: 0 });
  });

  it('allows 0-0', () => {
    expect(extractFulltimeScores({ goals: { home: 0, away: 0 } })).toEqual({
      homeScore: 0,
      awayScore: 0,
    });
  });
});
