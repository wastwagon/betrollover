import {
  exampleMoneyForDay,
  exampleReturnGhs,
  exampleStakeGhs,
  isEligibleRolloverTicket,
  selectEligibleRolloverTicket,
  slotKeyFromTitle,
  utcDateStamp,
} from './rollover-desk.util';

function ticket(
  id: number,
  odds: number,
  slot: 'Early' | 'Afternoon' | 'Evening',
  extras?: { totalPicks?: number; result?: string },
) {
  return {
    id,
    title: `Sure · 1X2 (Match Winner) · ${slot} · 2-fold @ ${odds} · 2026-08-18`,
    totalPicks: extras?.totalPicks ?? 2,
    totalOdds: odds,
    result: extras?.result ?? 'pending',
  };
}

describe('rollover-desk.util', () => {
  it('stamps UTC calendar dates as YYYY-MM-DD', () => {
    expect(utcDateStamp(new Date('2026-08-18T23:10:00.000Z'))).toBe('2026-08-18');
  });

  it('parses Acca Desk slot labels from titles', () => {
    expect(slotKeyFromTitle(ticket(1, 2.0, 'Early').title)).toBe('early');
    expect(slotKeyFromTitle(ticket(1, 2.0, 'Afternoon').title)).toBe('afternoon');
    expect(slotKeyFromTitle(ticket(1, 2.0, 'Evening').title)).toBe('evening');
  });

  it('parses AccaSure1X2 titles that omit the calendar-date suffix', () => {
    expect(slotKeyFromTitle('Sure · 1X2 (Match Winner) · Afternoon · 2-fold @ 1.96')).toBe('afternoon');
    expect(slotKeyFromTitle('Sure · 1X2 (Match Winner) · Evening · 2-fold @ 2.10')).toBe('evening');
    expect(slotKeyFromTitle('Sure · 1X2 (Match Winner) · Midnight · 2-fold @ 1.88 · 2026-08-29')).toBe(
      'midnight',
    );
  });

  it('treats pending 2-folds as eligible regardless of odds', () => {
    expect(isEligibleRolloverTicket(ticket(1, 1.1, 'Early'))).toBe(true);
    expect(isEligibleRolloverTicket(ticket(2, 6.5, 'Afternoon'))).toBe(true);
    expect(isEligibleRolloverTicket(ticket(3, 2.0, 'Evening', { totalPicks: 3 }))).toBe(false);
    expect(isEligibleRolloverTicket(ticket(4, 2.0, 'Evening', { result: 'won' }))).toBe(false);
  });

  it('prefers the earliest slot over a closer target later', () => {
    const picked = selectEligibleRolloverTicket([
      ticket(3, 2.0, 'Evening'),
      ticket(1, 1.8, 'Early'),
      ticket(2, 2.0, 'Afternoon'),
    ]);
    expect(picked?.id).toBe(1);
  });

  it('can prefer the latest slot for same-day Day 2', () => {
    const picked = selectEligibleRolloverTicket(
      [ticket(1, 1.8, 'Early'), ticket(2, 2.0, 'Afternoon'), ticket(3, 2.2, 'Evening')],
      new Set([2]),
      { preferLatestSlot: true },
    );
    expect(picked?.id).toBe(3);
  });

  it('ignores settled tickets and excluded ids', () => {
    const picked = selectEligibleRolloverTicket(
      [ticket(1, 2.0, 'Early', { result: 'void' }), ticket(2, 2.1, 'Afternoon')],
      new Set([2]),
    );
    expect(picked).toBeNull();
  });

  it('hides example cash after day 7', () => {
    expect(exampleStakeGhs(1)).toBe(20);
    expect(exampleReturnGhs(1)).toBeCloseTo(40);
    expect(exampleMoneyForDay(1).stakeGhs).toBe(20);
    expect(exampleMoneyForDay(7).stakeGhs).not.toBeNull();
    expect(exampleMoneyForDay(8).stakeGhs).toBeNull();
    expect(exampleMoneyForDay(30).returnGhs).toBeNull();
  });

  it('scales example cash from a custom campaign stake', () => {
    expect(exampleStakeGhs(1, 100)).toBe(100);
    expect(exampleReturnGhs(1, 100)).toBeCloseTo(200);
    expect(exampleMoneyForDay(1, 7, 100).stakeGhs).toBe(100);
    expect(exampleMoneyForDay(1, 7, 100).returnGhs).toBe(200);
    expect(exampleMoneyForDay(2, 7, 100).stakeGhs).toBe(200);
    expect(exampleMoneyForDay(2, 7, 100).returnGhs).toBe(400);
  });
});
