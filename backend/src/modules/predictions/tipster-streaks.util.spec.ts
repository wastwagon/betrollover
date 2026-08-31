import { computeStreaksFromNewestFirst } from './tipster-streaks.util';

function newestFirst(chronological: string[]): { result: string }[] {
  return [...chronological].reverse().map((result) => ({ result }));
}

describe('computeStreaksFromNewestFirst', () => {
  it('returns zeros with no settled picks', () => {
    expect(computeStreaksFromNewestFirst([])).toEqual({
      currentStreak: 0,
      bestStreak: 0,
      worstStreak: 0,
    });
    expect(computeStreaksFromNewestFirst([{ result: 'void' }, { result: 'pending' }])).toEqual({
      currentStreak: 0,
      bestStreak: 0,
      worstStreak: 0,
    });
  });

  it('tracks best win streak and worst loss streak independently', () => {
    // Chronological: WWW LLLL W
    expect(computeStreaksFromNewestFirst(newestFirst(['won', 'won', 'won', 'lost', 'lost', 'lost', 'lost', 'won']))).toEqual({
      currentStreak: 1,
      bestStreak: 3,
      worstStreak: 4,
    });
  });

  it('uses the newest settled pick for current streak (signed)', () => {
    expect(computeStreaksFromNewestFirst(newestFirst(['won', 'lost', 'lost']))).toEqual({
      currentStreak: -2,
      bestStreak: 1,
      worstStreak: 2,
    });
    expect(computeStreaksFromNewestFirst(newestFirst(['lost', 'won', 'won', 'won']))).toEqual({
      currentStreak: 3,
      bestStreak: 3,
      worstStreak: 1,
    });
  });

  it('treats an all-loss sample as worst streak only', () => {
    expect(computeStreaksFromNewestFirst(newestFirst(['lost', 'lost', 'lost']))).toEqual({
      currentStreak: -3,
      bestStreak: 0,
      worstStreak: 3,
    });
  });

  it('skips voids inside a run so they do not break win/loss streaks', () => {
    expect(
      computeStreaksFromNewestFirst(
        newestFirst(['won', 'void', 'won', 'lost', 'void', 'lost', 'lost']),
      ),
    ).toEqual({
      currentStreak: -3,
      bestStreak: 2,
      worstStreak: 3,
    });
  });
});
