/**
 * Acca Desk time buckets (PREDICTION_TIMEZONE / Africa/Accra).
 * One 2-fold per slot per tipster when enough clustered fixtures exist.
 *
 * Desk day D windows (Accra):
 *   Early      D 06:00–14:59
 *   Afternoon  D 15:00–18:59
 *   Evening    D 19:00–22:59
 *   Midnight   D 23:00 → (D+1) 05:59  (cross-calendar-day legs allowed)
 *
 * Fixture pool for desk day D = [D 06:00, (D+1) 06:00) so 00:00–05:59 on D
 * belong to desk day D−1 Midnight, not D Early.
 */

export type AccaDeskSlotKey = 'early' | 'afternoon' | 'evening' | 'midnight';

export type AccaDeskTimeSlot = {
  key: AccaDeskSlotKey;
  label: string;
  /** Inclusive minutes from local midnight (0–1439). Midnight uses a wrap range. */
  startMinutes: number;
  /** Inclusive minutes from local midnight. */
  endMinutes: number;
  /** When true, startMinutes > endMinutes (23:00–05:59). */
  wrapsMidnight?: boolean;
};

/** Contiguous desk-day coverage from 06:00 through next-day 05:59. */
export const ACCA_DESK_TIME_SLOTS: AccaDeskTimeSlot[] = [
  { key: 'early', label: 'Early', startMinutes: 6 * 60, endMinutes: 14 * 60 + 59 },
  { key: 'afternoon', label: 'Afternoon', startMinutes: 15 * 60, endMinutes: 18 * 60 + 59 },
  { key: 'evening', label: 'Evening', startMinutes: 19 * 60, endMinutes: 22 * 60 + 59 },
  {
    key: 'midnight',
    label: 'Midnight',
    startMinutes: 23 * 60,
    endMinutes: 5 * 60 + 59,
    wrapsMidnight: true,
  },
];

/** Max kick-off gap between the two legs in one coupon. */
export const ACCA_DESK_MAX_KICKOFF_GAP_MS = 3 * 60 * 60 * 1000;

export const ACCA_DESK_MAX_PER_DAY = ACCA_DESK_TIME_SLOTS.length;

/** Accra (or PREDICTION_TIMEZONE) calendar date YYYY-MM-DD. */
export function accraDateStr(date: Date = new Date(), timeZone = 'Africa/Accra'): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/** Add whole calendar days to a YYYY-MM-DD stamp (UTC noon math — Accra has no DST). */
export function addDateStrDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Inclusive start / exclusive end for desk day D fixture pool:
 * D 06:00 Accra → (D+1) 06:00 Accra.
 */
export function deskDayFixtureWindow(
  deskDayStr: string,
  timeZone = 'Africa/Accra',
): { start: Date; end: Date } {
  // Accra = UTC year-round; store match_date as UTC wall clock matching Accra.
  void timeZone;
  const start = new Date(`${deskDayStr}T06:00:00.000Z`);
  const next = addDateStrDays(deskDayStr, 1);
  const end = new Date(`${next}T06:00:00.000Z`);
  return { start, end };
}

export function minutesOfDayInTimeZone(date: Date, timeZone: string): number | null {
  if (!Number.isFinite(date.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const hour = Number(parts.find((p) => p.type === 'hour')?.value);
    const minute = Number(parts.find((p) => p.type === 'minute')?.value);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return hour * 60 + minute;
  } catch {
    return null;
  }
}

function minutesInSlot(minutes: number, slot: AccaDeskTimeSlot): boolean {
  if (slot.wrapsMidnight) {
    return minutes >= slot.startMinutes || minutes <= slot.endMinutes;
  }
  return minutes >= slot.startMinutes && minutes <= slot.endMinutes;
}

export function slotForKickoff(
  matchDate: Date | string,
  timeZone: string,
  slots: AccaDeskTimeSlot[] = ACCA_DESK_TIME_SLOTS,
): AccaDeskTimeSlot | null {
  const date = matchDate instanceof Date ? matchDate : new Date(matchDate);
  const minutes = minutesOfDayInTimeZone(date, timeZone);
  if (minutes == null) return null;
  return slots.find((s) => minutesInSlot(minutes, s)) ?? null;
}

/** Parse `· YYYY-MM-DD` desk-day stamp from Acca Desk titles. */
export function deskDayFromTitle(title: string | null | undefined): string | null {
  if (!title) return null;
  const m = title.match(/·\s*(\d{4}-\d{2}-\d{2})\s*$/);
  return m?.[1] ?? null;
}

/** Resolve admin/API `deskDay` body: today | tomorrow | YYYY-MM-DD. */
export function resolveDeskDayArg(
  raw: string | null | undefined,
  timeZone = 'Africa/Accra',
  now = new Date(),
): { deskDayStr: string; today: string } {
  const today = accraDateStr(now, timeZone);
  const trimmed = (raw || 'today').trim().toLowerCase();
  if (trimmed === 'today' || trimmed === '') return { deskDayStr: today, today };
  if (trimmed === 'tomorrow') return { deskDayStr: addDateStrDays(today, 1), today };
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return { deskDayStr: trimmed, today };
  throw new Error('deskDay must be today, tomorrow, or YYYY-MM-DD');
}

/** Acca Desk title shape used when tipsterType is missing on a card payload. */
export function looksLikeAccaDeskTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  return /·\s*(Early|Afternoon|Evening|Midnight)\s*·\s*2-fold\s*@/i.test(title);
}

export type ClusterCandidate = {
  fixtureId: number;
  matchDate: string;
  score?: number;
  outcomeKey: string;
};

/**
 * Pick 2 legs in the same slot: best-scoring fixture, then best partner within maxGapMs.
 * Prefers closer kick-offs when partner scores tie. Cross-midnight pairs OK within maxGapMs.
 */
export function pickTimeClusteredPair<T extends ClusterCandidate>(
  candidates: T[],
  maxGapMs: number,
  outcomeFamily: (outcomeKey: string) => string,
): T[] {
  if (candidates.length < 2) return [];
  const sorted = [...candidates].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  for (const first of sorted) {
    const t1 = new Date(first.matchDate).getTime();
    if (!Number.isFinite(t1)) continue;

    let best: T | null = null;
    let bestAdj = -Infinity;
    let bestGap = Infinity;

    for (const other of sorted) {
      if (other.fixtureId === first.fixtureId) continue;
      const t2 = new Date(other.matchDate).getTime();
      if (!Number.isFinite(t2)) continue;
      const gap = Math.abs(t2 - t1);
      if (gap > maxGapMs) continue;
      const sameFamily = outcomeFamily(first.outcomeKey) === outcomeFamily(other.outcomeKey);
      const adj = (other.score ?? 0) - (sameFamily ? 0.12 : 0);
      if (adj > bestAdj || (adj === bestAdj && gap < bestGap)) {
        best = other;
        bestAdj = adj;
        bestGap = gap;
      }
    }

    if (best) {
      return [first, best].sort(
        (a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime(),
      );
    }
  }

  return [];
}
