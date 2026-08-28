import { ACCA_DESK_TIME_SLOTS, accraDateStr, type AccaDeskSlotKey } from '../../config/acca-desk-slots';
import {
  ROLLOVER_EXAMPLE_MAX_MONEY_DAY,
  ROLLOVER_EXAMPLE_STAKE_GHS,
  ROLLOVER_ODDS_MAX,
  ROLLOVER_ODDS_MIN,
  ROLLOVER_TARGET_ODDS,
  ROLLOVER_TIMEZONE,
} from '../../config/rollover-desk.config';

export type RolloverTicketLike = {
  id: number;
  title?: string | null;
  totalPicks: number;
  totalOdds: number | string;
  result?: string | null;
};

const SLOT_RANK: Record<AccaDeskSlotKey, number> = {
  early: 0,
  afternoon: 1,
  evening: 2,
  midnight: 3,
};

/** Accra (PREDICTION_TIMEZONE) calendar stamp — same as Acca Desk desk day. */
export function utcDateStamp(now = new Date()): string {
  return accraDateStr(now, ROLLOVER_TIMEZONE);
}

export function utcDayBounds(now = new Date()): { start: Date; end: Date } {
  const stamp = utcDateStamp(now);
  const start = new Date(`${stamp}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export function slotKeyFromTitle(title: string | null | undefined): AccaDeskSlotKey | null {
  if (!title) return null;
  return ACCA_DESK_TIME_SLOTS.find((s) => title.includes(`· ${s.label} ·`))?.key ?? null;
}

export function isQualifyingRolloverOdds(odds: number): boolean {
  return Number.isFinite(odds) && odds >= ROLLOVER_ODDS_MIN && odds <= ROLLOVER_ODDS_MAX;
}

/** Earliest Acca Desk slot in range; ties break toward 1.60.
 * `preferLatestSlot` picks later slots (midnight over evening) for admin same-day Day 2. */
export function selectQualifyingRolloverTicket<T extends RolloverTicketLike>(
  tickets: T[],
  excludeTicketIds: Set<number> = new Set(),
  opts?: { preferLatestSlot?: boolean },
): T | null {
  const eligible = tickets.filter((t) => {
    if (excludeTicketIds.has(t.id)) return false;
    if (t.totalPicks !== 2) return false;
    const result = (t.result || 'pending').toLowerCase();
    if (result !== 'pending') return false;
    return isQualifyingRolloverOdds(Number(t.totalOdds));
  });

  eligible.sort((a, b) => {
    const ra = SLOT_RANK[slotKeyFromTitle(a.title) ?? 'evening'] ?? 9;
    const rb = SLOT_RANK[slotKeyFromTitle(b.title) ?? 'evening'] ?? 9;
    if (ra !== rb) return opts?.preferLatestSlot ? rb - ra : ra - rb;
    const da = Math.abs(Number(a.totalOdds) - ROLLOVER_TARGET_ODDS);
    const db = Math.abs(Number(b.totalOdds) - ROLLOVER_TARGET_ODDS);
    return da - db;
  });

  return eligible[0] ?? null;
}

export function exampleStakeGhs(
  dayNumber: number,
  start = ROLLOVER_EXAMPLE_STAKE_GHS,
  odds = ROLLOVER_TARGET_ODDS,
): number {
  return start * Math.pow(odds, Math.max(0, dayNumber - 1));
}

export function exampleReturnGhs(
  dayNumber: number,
  start = ROLLOVER_EXAMPLE_STAKE_GHS,
  odds = ROLLOVER_TARGET_ODDS,
): number {
  return start * Math.pow(odds, Math.max(0, dayNumber));
}

export function exampleMoneyForDay(
  dayNumber: number,
  maxDay = ROLLOVER_EXAMPLE_MAX_MONEY_DAY,
  start = ROLLOVER_EXAMPLE_STAKE_GHS,
  odds = ROLLOVER_TARGET_ODDS,
): { stakeGhs: number | null; returnGhs: number | null } {
  if (dayNumber < 1 || dayNumber > maxDay) {
    return { stakeGhs: null, returnGhs: null };
  }
  return {
    stakeGhs: Math.round(exampleStakeGhs(dayNumber, start, odds)),
    returnGhs: Math.round(exampleReturnGhs(dayNumber, start, odds)),
  };
}
