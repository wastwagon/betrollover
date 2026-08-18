const WEEKDAY: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export const RECAP_MAX_SLIPS = 5;

/** Africa/Accra weekday: 0 Sunday … 6 Saturday. */
export function accraWeekday(now: Date, timeZone: string): number {
  const day = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(now);
  return WEEKDAY[day] ?? -1;
}

export function isAccraMonday(now: Date, timeZone: string): boolean {
  return accraWeekday(now, timeZone) === 1;
}

/** ISO date of this Accra week’s Monday 00:00 UTC (Accra is GMT). */
export function recapCampaignKey(mondayStart: Date): string {
  return `recap_week_${mondayStart.toISOString().slice(0, 10)}`;
}

/** Settled window: previous Accra Monday 00:00 up to this Monday 00:00. */
export function recapWindow(mondayStart: Date): { from: Date; to: Date } {
  return {
    from: new Date(mondayStart.getTime() - 7 * 24 * 60 * 60 * 1000),
    to: mondayStart,
  };
}
