import { groupAccaDeskShortsByFollower, type AccaDeskShort } from './acca-desk-shorts.config';

const shorts: AccaDeskShort[] = [
  {
    ticketId: 1,
    tipsterUserId: 10,
    tipsterDisplayName: 'Sure · O2.5',
    title: 'Sure · Over 2.5 · Afternoon',
    totalOdds: 4,
    totalPicks: 2,
    legs: [],
  },
  {
    ticketId: 2,
    tipsterUserId: 11,
    tipsterDisplayName: 'Medium · BTTS',
    title: 'Medium · BTTS · Evening',
    totalOdds: 3.8,
    totalPicks: 2,
    legs: [],
  },
];

describe('groupAccaDeskShortsByFollower', () => {
  it('only includes shorts from bots the user follows', () => {
    const grouped = groupAccaDeskShortsByFollower(shorts, [
      { userId: 50, tipsterUserId: 10 },
      { userId: 51, tipsterUserId: 10 },
      { userId: 51, tipsterUserId: 11 },
    ]);
    expect(grouped.get(50)?.map((s) => s.ticketId)).toEqual([1]);
    expect(grouped.get(51)?.map((s) => s.ticketId)).toEqual([1, 2]);
    expect(grouped.has(99)).toBe(false);
  });

  it('does not email a bot its own slip', () => {
    const grouped = groupAccaDeskShortsByFollower(shorts, [{ userId: 10, tipsterUserId: 10 }]);
    expect(grouped.has(10)).toBe(false);
  });
});
