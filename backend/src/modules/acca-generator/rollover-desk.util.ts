import { ACCA_DESK_TIME_SLOTS, accraDateStr, addDateStrDays, type AccaDeskSlotKey } from '../../config/acca-desk-slots';
import {
  ROLLOVER_EXAMPLE_MAX_MONEY_DAY,
  ROLLOVER_EXAMPLE_STAKE_GHS,
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

/** Pending marketplace 2-fold — eligibility for rollover attach (auto or admin). */
export function isEligibleRolloverTicket(t: RolloverTicketLike): boolean {
  if (t.totalPicks !== 2) return false;
  const result = (t.result || 'pending').toLowerCase();
  return result === 'pending';
}

/** Earliest Acca Desk slot; ties break toward ROLLOVER_TARGET_ODDS (example money only).
 * `preferLatestSlot` picks later slots for admin same-day Day N+1. */
export function selectEligibleRolloverTicket<T extends RolloverTicketLike>(
  tickets: T[],
  excludeTicketIds: Set<number> = new Set(),
  opts?: { preferLatestSlot?: boolean },
): T | null {
  const eligible = tickets.filter((t) => !excludeTicketIds.has(t.id) && isEligibleRolloverTicket(t));

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
  return buildBoardMoneyLadder(Array(Math.max(0, dayNumber)).fill(null), start, odds)[dayNumber - 1]
    ?.stakeGhs ?? start;
}

export function exampleReturnGhs(
  dayNumber: number,
  start = ROLLOVER_EXAMPLE_STAKE_GHS,
  odds = ROLLOVER_TARGET_ODDS,
): number {
  return buildBoardMoneyLadder(Array(Math.max(0, dayNumber)).fill(null), start, odds)[dayNumber - 1]
    ?.returnGhs ?? start * odds;
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
  const row = buildBoardMoneyLadder(Array(maxDay).fill(null), start, odds)[dayNumber - 1];
  return { stakeGhs: row.stakeGhs, returnGhs: row.returnGhs };
}

/** Live coupon odds when set; otherwise educational target (1.6). */
export function resolveDayOdds(
  combinedOdds: number | null | undefined,
  targetOdds = ROLLOVER_TARGET_ODDS,
): number {
  if (combinedOdds != null && Number.isFinite(Number(combinedOdds)) && Number(combinedOdds) > 0) {
    return Number(combinedOdds);
  }
  return targetOdds;
}

export type RolloverDayStatLike = {
  dayNumber: number;
  status: string;
  combinedOdds?: number | null;
};

/**
 * Odds for won days from Day 1 until the first non-win.
 * A cut on Day 4 with Days 1–3 won yields three rungs — not dummy ×1.60³.
 */
export function consecutiveWonDayOdds(days: RolloverDayStatLike[]): Array<number | null> {
  const byNumber = new Map(days.map((d) => [d.dayNumber, d]));
  const odds: Array<number | null> = [];
  for (let n = 1; ; n++) {
    const day = byNumber.get(n);
    if (!day || day.status !== 'won') break;
    const raw = day.combinedOdds;
    odds.push(raw != null && Number.isFinite(Number(raw)) && Number(raw) > 0 ? Number(raw) : null);
  }
  return odds;
}

/** Example bank after a consecutive win streak, using attached coupon odds. */
export function archiveMoneyForWonOdds(
  dayOdds: Array<number | null>,
  start = ROLLOVER_EXAMPLE_STAKE_GHS,
  targetOdds = ROLLOVER_TARGET_ODDS,
): { wonDays: number; stakeGhs: number | null; returnGhs: number | null } {
  if (!dayOdds.length) {
    return { wonDays: 0, stakeGhs: null, returnGhs: null };
  }
  const ladder = buildBoardMoneyLadder(dayOdds, start, targetOdds);
  return {
    wonDays: dayOdds.length,
    stakeGhs: Math.round(start),
    returnGhs: ladder[ladder.length - 1].returnGhs,
  };
}

export function archiveMoneyForRun(
  days: RolloverDayStatLike[],
  start = ROLLOVER_EXAMPLE_STAKE_GHS,
  targetOdds = ROLLOVER_TARGET_ODDS,
): { wonDays: number; stakeGhs: number | null; returnGhs: number | null } {
  return archiveMoneyForWonOdds(consecutiveWonDayOdds(days), start, targetOdds);
}

/**
 * Full plan ladder. Each open day uses ×targetOdds; an attached coupon's odds
 * replace that dummy for the day. Stake day N = After win day N−1.
 */
export function buildBoardMoneyLadder(
  dayOdds: Array<number | null | undefined>,
  start = ROLLOVER_EXAMPLE_STAKE_GHS,
  targetOdds = ROLLOVER_TARGET_ODDS,
): Array<{ stakeGhs: number; returnGhs: number; odds: number }> {
  const rows: Array<{ stakeGhs: number; returnGhs: number; odds: number }> = [];
  let stake = start;
  for (const raw of dayOdds) {
    const odds = resolveDayOdds(raw, targetOdds);
    const stakeGhs = Math.round(stake);
    const returnGhs = Math.round(stakeGhs * odds);
    rows.push({ stakeGhs, returnGhs, odds });
    stake = returnGhs;
  }
  return rows;
}

/** Attached days keep their real Accra date; open days continue one calendar day at a time. */
export function fillPlanCalendarDates(
  dates: Array<string | null | undefined>,
  today: string,
): string[] {
  const out: string[] = [];
  let last: string | null = null;
  for (const raw of dates) {
    if (raw) {
      last = raw;
      out.push(raw);
    } else {
      last = last ? addDateStrDays(last, 1) : today;
      out.push(last);
    }
  }
  return out;
}
