import { hasNegativeRoi, mixHomeTopPerforming } from './home-top-performing';

function row(partial: Record<string, unknown>): Record<string, unknown> {
  return {
    total_wins: 20,
    total_losses: 10,
    tipster_type: 'acca_desk',
    ...partial,
  };
}

describe('home Top Performing from leaderboard', () => {
  it('flags any entry with ROI below 0', () => {
    expect(hasNegativeRoi(row({ roi: -13.9 }))).toBe(true);
    expect(hasNegativeRoi(row({ roi: 0 }))).toBe(false);
    expect(hasNegativeRoi(row({ roi: 2.8 }))).toBe(false);
    expect(hasNegativeRoi(row({ roi: 'not-a-number' }))).toBe(false);
  });

  it('keeps leaderboard order and drops negatives, without mixing desks ahead of humans', () => {
    const mixed = mixHomeTopPerforming([
      row({ username: 'AccaSafeO15', roi: 89.7, rank: 1 }),
      row({ username: 'AccaSure1X2', roi: 62.8, rank: 2 }),
      row({ username: 'AccaSureDC', roi: -4.1, rank: 9 }),
      row({ username: 'AccaSafeBTTS', roi: -13.9, rank: 11 }),
      {
        username: 'sarkarnayan856',
        tipster_type: 'human',
        roi: 41.6,
        rank: 3,
        total_wins: 19,
        total_losses: 28,
      },
      row({ username: 'AccaSafeDC', roi: 2.8, rank: 4 }),
    ]);
    expect(mixed.map((e) => e.username)).toEqual([
      'AccaSafeO15',
      'AccaSure1X2',
      'sarkarnayan856',
      'AccaSafeDC',
    ]);
  });
});
