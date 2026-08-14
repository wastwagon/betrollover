/**
 * Kickoff urgency helpers for pick cards / sticky buy.
 */

export type KickoffUrgency = {
  earliestMs: number;
  msUntil: number;
  /** Short label e.g. "in 2h 15m" or "Started" */
  labelKey: 'started' | 'soon' | 'today' | 'later';
  hours: number;
  minutes: number;
};

export function earliestKickoffMs(
  picks: Array<{ matchDate?: string | Date | null }> | null | undefined,
): number | null {
  if (!picks?.length) return null;
  let min: number | null = null;
  for (const p of picks) {
    if (!p.matchDate) continue;
    const t = p.matchDate instanceof Date ? p.matchDate.getTime() : new Date(p.matchDate).getTime();
    if (!Number.isFinite(t)) continue;
    if (min == null || t < min) min = t;
  }
  return min;
}

export function computeKickoffUrgency(
  picks: Array<{ matchDate?: string | Date | null }> | null | undefined,
  nowMs = Date.now(),
): KickoffUrgency | null {
  const earliestMs = earliestKickoffMs(picks);
  if (earliestMs == null) return null;
  const msUntil = earliestMs - nowMs;
  const abs = Math.abs(msUntil);
  const hours = Math.floor(abs / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);
  let labelKey: KickoffUrgency['labelKey'] = 'later';
  if (msUntil <= 0) labelKey = 'started';
  else if (msUntil <= 2 * 3_600_000) labelKey = 'soon';
  else if (msUntil <= 24 * 3_600_000) labelKey = 'today';
  return { earliestMs, msUntil, labelKey, hours, minutes };
}
