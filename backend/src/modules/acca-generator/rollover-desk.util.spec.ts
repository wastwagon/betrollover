import { ROLLOVER_SLOT_ORDER } from '../../config/rollover-desk.config';
import {
  archiveMoneyForRun,
  buildBoardMoneyLadder,
  exampleMoneyForDay,
  exampleReturnGhs,
  exampleStakeGhs,
  isEligibleRolloverTicket,
  selectEligibleRolloverTicket,
  slotKeyFromTitle,
  utcDateStamp,
  fillPlanCalendarDates,
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

  it('offers every Acca Desk slot including Midnight for VIP attach', () => {
    expect(ROLLOVER_SLOT_ORDER).toEqual(['early', 'afternoon', 'evening', 'midnight']);
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

  it('shows example cash for the full 2-day plan from GHS 100 at ×1.6', () => {
    expect(exampleStakeGhs(1)).toBe(100);
    expect(exampleReturnGhs(1)).toBe(160);
    expect(exampleMoneyForDay(1).stakeGhs).toBe(100);
    expect(exampleMoneyForDay(1).returnGhs).toBe(160);
    expect(exampleMoneyForDay(2).stakeGhs).toBe(160);
    expect(exampleMoneyForDay(2).returnGhs).toBe(256);
    expect(exampleMoneyForDay(3).stakeGhs).toBeNull();
    expect(exampleMoneyForDay(7).stakeGhs).toBeNull();
  });

  it('scales example cash from a custom campaign stake', () => {
    expect(exampleStakeGhs(1, 50)).toBe(50);
    expect(exampleReturnGhs(1, 50)).toBe(80);
    expect(exampleMoneyForDay(1, 2, 50).stakeGhs).toBe(50);
    expect(exampleMoneyForDay(1, 2, 50).returnGhs).toBe(80);
    expect(exampleMoneyForDay(2, 2, 50).stakeGhs).toBe(80);
    expect(exampleMoneyForDay(2, 2, 50).returnGhs).toBe(128);
  });

  it('records After win from consecutive real odds, not dummy 1.6', () => {
    const cutAtDay4 = archiveMoneyForRun([
      { dayNumber: 1, status: 'won', combinedOdds: 1.64 },
      { dayNumber: 2, status: 'won', combinedOdds: 1.8 },
      { dayNumber: 3, status: 'won', combinedOdds: 1.7 },
      { dayNumber: 4, status: 'lost', combinedOdds: 1.62 },
    ]);
    expect(cutAtDay4.wonDays).toBe(3);
    expect(cutAtDay4.stakeGhs).toBe(100);
    // 100×1.64=164; 164×1.80=295; 295×1.70=502 — dummy ×1.60³ is 410
    expect(cutAtDay4.returnGhs).toBe(502);
    // Dummy ladder still compounds beyond the live 2-day board when maxDay is raised for the check.
    expect(exampleMoneyForDay(3, 3).returnGhs).toBe(410);

    const holeAfterDay2 = archiveMoneyForRun([
      { dayNumber: 1, status: 'won', combinedOdds: 1.6 },
      { dayNumber: 2, status: 'won', combinedOdds: 1.6 },
      { dayNumber: 4, status: 'won', combinedOdds: 2.0 },
    ]);
    expect(holeAfterDay2.wonDays).toBe(2);
    expect(holeAfterDay2.returnGhs).toBe(256);
  });

  it('replaces dummy 1.6 with live odds and chains stake from After win', () => {
    const open = buildBoardMoneyLadder(Array(10).fill(null));
    expect(open[0]).toMatchObject({ stakeGhs: 100, returnGhs: 160, odds: 1.6 });
    expect(open[9].returnGhs).toBe(11011);

    const live = buildBoardMoneyLadder([1.64, null, null]);
    expect(live[0]).toMatchObject({ stakeGhs: 100, returnGhs: 164, odds: 1.64 });
    expect(live[1]).toMatchObject({ stakeGhs: 164, returnGhs: 262, odds: 1.6 });
    expect(live[2]).toMatchObject({ stakeGhs: 262, returnGhs: 419, odds: 1.6 });

    const twoLive = buildBoardMoneyLadder([1.64, 1.8, null]);
    expect(twoLive[1]).toMatchObject({ stakeGhs: 164, returnGhs: 295, odds: 1.8 });
    expect(twoLive[2]).toMatchObject({ stakeGhs: 295, returnGhs: 472, odds: 1.6 });
  });

  it('keeps attached calendar dates and fills open days forward from today', () => {
    expect(fillPlanCalendarDates([null, null, null], '2026-09-02')).toEqual([
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
    ]);
    expect(
      fillPlanCalendarDates(['2026-08-30', '2026-08-30', '2026-08-31', null, null], '2026-09-02'),
    ).toEqual(['2026-08-30', '2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02']);
  });
});
