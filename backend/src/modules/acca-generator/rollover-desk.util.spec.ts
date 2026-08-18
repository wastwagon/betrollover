import {
  exampleMoneyForDay,
  exampleReturnGhs,
  exampleStakeGhs,
  isQualifyingRolloverOdds,
  selectQualifyingRolloverTicket,
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
    title: `Sure · Over 1.5 Goals · ${slot} · 2-fold @ ${odds} · 2026-08-18`,
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
    expect(slotKeyFromTitle(ticket(1, 1.6, 'Early').title)).toBe('early');
    expect(slotKeyFromTitle(ticket(1, 1.6, 'Afternoon').title)).toBe('afternoon');
    expect(slotKeyFromTitle(ticket(1, 1.6, 'Evening').title)).toBe('evening');
  });

  it('parses live AccaSureO15 titles that omit the calendar-date suffix', () => {
    expect(slotKeyFromTitle('Sure · Over 1.5 Goals · Afternoon · 2-fold @ 1.638')).toBe('afternoon');
    expect(slotKeyFromTitle('Sure · Over 1.5 Goals · Evening · 2-fold @ 1.664')).toBe('evening');
  });

  it('accepts combined odds in 1.50–1.75', () => {
    expect(isQualifyingRolloverOdds(1.5)).toBe(true);
    expect(isQualifyingRolloverOdds(1.75)).toBe(true);
    expect(isQualifyingRolloverOdds(1.49)).toBe(false);
    expect(isQualifyingRolloverOdds(1.76)).toBe(false);
  });

  it('prefers the earliest qualifying slot over a closer 1.60 later', () => {
    const picked = selectQualifyingRolloverTicket([
      ticket(3, 1.6, 'Evening'),
      ticket(1, 1.52, 'Early'),
      ticket(2, 1.6, 'Afternoon'),
    ]);
    expect(picked?.id).toBe(1);
  });

  it('skips out-of-range early slots and takes the next qualifying one', () => {
    const picked = selectQualifyingRolloverTicket([
      ticket(1, 1.8, 'Early'),
      ticket(2, 1.64, 'Afternoon'),
    ]);
    expect(picked?.id).toBe(2);
  });

  it('can prefer the latest qualifying slot for same-day Day 2', () => {
    const picked = selectQualifyingRolloverTicket(
      [ticket(1, 1.52, 'Early'), ticket(2, 1.64, 'Afternoon'), ticket(3, 1.66, 'Evening')],
      new Set([2]),
      { preferLatestSlot: true },
    );
    expect(picked?.id).toBe(3);
  });

  it('ignores settled tickets and excluded ids', () => {
    const picked = selectQualifyingRolloverTicket(
      [ticket(1, 1.6, 'Early', { result: 'void' }), ticket(2, 1.62, 'Afternoon')],
      new Set([2]),
    );
    expect(picked).toBeNull();
  });

  it('hides example cash after day 7', () => {
    expect(exampleStakeGhs(1)).toBe(20);
    expect(exampleReturnGhs(1)).toBeCloseTo(32);
    expect(exampleMoneyForDay(1).stakeGhs).toBe(20);
    expect(exampleMoneyForDay(7).stakeGhs).not.toBeNull();
    expect(exampleMoneyForDay(8).stakeGhs).toBeNull();
    expect(exampleMoneyForDay(30).returnGhs).toBeNull();
  });

  it('scales example cash from a custom campaign stake', () => {
    expect(exampleStakeGhs(1, 100)).toBe(100);
    expect(exampleReturnGhs(1, 100)).toBeCloseTo(160);
    expect(exampleMoneyForDay(1, 7, 100).stakeGhs).toBe(100);
    expect(exampleMoneyForDay(1, 7, 100).returnGhs).toBe(160);
    expect(exampleMoneyForDay(2, 7, 100).stakeGhs).toBe(160);
    expect(exampleMoneyForDay(2, 7, 100).returnGhs).toBe(256);
  });
});
