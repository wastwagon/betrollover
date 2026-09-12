import { hasPrimaryLeaderboardSample } from '@/lib/leaderboard-sample';

/** ROI below 0% — keep 0 and unknown on the shelf. */
export function hasNegativeRoi(entry: Record<string, unknown>): boolean {
  const roi = Number(entry.roi);
  return Number.isFinite(roi) && roi < 0;
}

/**
 * Homepage Top Performing = top of GET /leaderboard?period=all_time, in that order.
 * Skips negative ROI so the shelf stays the green band the board already ranks first.
 */
export function mixHomeTopPerforming(
  entries: Record<string, unknown>[],
  max = 8,
): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const e of entries) {
    if (!hasPrimaryLeaderboardSample(e)) continue;
    if (hasNegativeRoi(e)) continue;
    out.push(e);
    if (out.length >= max) break;
  }
  return out;
}
