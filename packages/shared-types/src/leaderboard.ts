/**
 * All-time + monthly leaderboard + homepage Top Performing: minimum settled picks
 * (wins + losses) for the primary ranking tier.
 */
export const LEADERBOARD_MIN_SETTLED_FOR_PRIMARY_RANKING = 10;

/** Weekly window: shorter horizon, so a lower floor for the primary tier. */
export const LEADERBOARD_MIN_SETTLED_WEEKLY = 3;

/**
 * Rolling window: must have posted a marketplace pick in this many days
 * to appear on homepage Top Performing and the all-time leaderboard.
 */
export const TIPSTER_ACTIVE_WITHIN_DAYS = 7;

/**
 * Extra form points stop after this many Accra posting days in the window.
 * Capped at the activity window so daily desks cannot stack past a week of presence.
 */
export const TIPSTER_FORM_POST_CAP = TIPSTER_ACTIVE_WITHIN_DAYS;

export type TipsterFormPointsInput = {
  winRate: number;
  roi: number;
  /** Distinct Accra calendar days with a marketplace post in the activity window. */
  postsInWindow: number;
  /** Whole days since last marketplace post. Null = never posted. */
  daysSinceLastPost: number | null;
};

export function isTipsterActivePoster(
  daysSinceLastPost: number | null,
  windowDays = TIPSTER_ACTIVE_WITHIN_DAYS,
): boolean {
  return daysSinceLastPost != null && daysSinceLastPost <= windowDays;
}

/**
 * Transparent form score (about 0–90).
 * Quality (win rate + capped positive ROI) plus capped recent posting days and a small recency bump.
 */
export function computeTipsterFormPoints(input: TipsterFormPointsInput): number {
  if (!isTipsterActivePoster(input.daysSinceLastPost)) return 0;
  const wr = Math.max(0, Math.min(100, Number(input.winRate) || 0));
  const roi = Number(input.roi) || 0;
  const wrPts = Math.round(wr * 0.4);
  const roiPts = Math.round(Math.max(0, Math.min(200, roi)) / 10);
  const posts = Math.max(0, Math.floor(Number(input.postsInWindow) || 0));
  const postPts = Math.min(posts, TIPSTER_FORM_POST_CAP) * 3;
  const days = input.daysSinceLastPost ?? TIPSTER_ACTIVE_WITHIN_DAYS + 1;
  let recency = 0;
  if (days <= 1) recency = 6;
  else if (days <= 3) recency = 4;
  else if (days <= TIPSTER_ACTIVE_WITHIN_DAYS) recency = 2;
  return wrPts + roiPts + postPts + recency;
}

export function daysSinceTimestamp(lastPostedAt: Date | string | null | undefined, now = new Date()): number | null {
  if (!lastPostedAt) return null;
  const t = lastPostedAt instanceof Date ? lastPostedAt.getTime() : new Date(lastPostedAt).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((now.getTime() - t) / 86_400_000));
}
