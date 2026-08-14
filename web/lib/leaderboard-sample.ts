import { LEADERBOARD_MIN_SETTLED_FOR_PRIMARY_RANKING } from '@betrollover/shared-types';

/** Settled W+L for leaderboard / home modules (API may omit losses). */
export function settledPickCount(entry: Record<string, unknown>): number {
  const wins = Number(entry.total_wins ?? entry.monthly_wins ?? 0) || 0;
  if (entry.total_losses != null) {
    return wins + (Number(entry.total_losses) || 0);
  }
  const preds = Number(entry.total_predictions ?? entry.monthly_predictions ?? 0) || 0;
  return wins + Math.max(0, preds - wins);
}

export function hasPrimaryLeaderboardSample(
  entry: Record<string, unknown>,
  min = LEADERBOARD_MIN_SETTLED_FOR_PRIMARY_RANKING,
): boolean {
  return settledPickCount(entry) >= min;
}
