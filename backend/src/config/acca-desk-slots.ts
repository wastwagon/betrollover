/**
 * Acca Desk time buckets (PREDICTION_TIMEZONE / Africa/Accra).
 * One 2-fold per slot per tipster when enough clustered fixtures exist.
 */

export type AccaDeskSlotKey = 'early' | 'afternoon' | 'evening';

export type AccaDeskTimeSlot = {
  key: AccaDeskSlotKey;
  label: string;
  /** Inclusive minutes from local midnight. */
  startMinutes: number;
  /** Inclusive minutes from local midnight. */
  endMinutes: number;
};

/** Early / afternoon / evening-night — contiguous so no fixtures fall in a gap. */
export const ACCA_DESK_TIME_SLOTS: AccaDeskTimeSlot[] = [
  { key: 'early', label: 'Early', startMinutes: 0, endMinutes: 14 * 60 + 59 },
  { key: 'afternoon', label: 'Afternoon', startMinutes: 15 * 60, endMinutes: 18 * 60 + 59 },
  { key: 'evening', label: 'Evening', startMinutes: 19 * 60, endMinutes: 23 * 60 + 59 },
];

/** Max kick-off gap between the two legs in one coupon (covers 15:00+18:00 and 19:00+22:00). */
export const ACCA_DESK_MAX_KICKOFF_GAP_MS = 3 * 60 * 60 * 1000;

export const ACCA_DESK_MAX_PER_DAY = ACCA_DESK_TIME_SLOTS.length;

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

export function slotForKickoff(
  matchDate: Date | string,
  timeZone: string,
  slots: AccaDeskTimeSlot[] = ACCA_DESK_TIME_SLOTS,
): AccaDeskTimeSlot | null {
  const date = matchDate instanceof Date ? matchDate : new Date(matchDate);
  const minutes = minutesOfDayInTimeZone(date, timeZone);
  if (minutes == null) return null;
  return slots.find((s) => minutes >= s.startMinutes && minutes <= s.endMinutes) ?? null;
}

export type ClusterCandidate = {
  fixtureId: number;
  matchDate: string;
  score?: number;
  outcomeKey: string;
};

/**
 * Pick 2 legs in the same slot: best-scoring fixture, then best partner within maxGapMs.
 * Prefers closer kick-offs when partner scores tie.
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
