/** Bumped when persisted leaderboard ranks refresh so HTTP cache keys rotate. */
export const LEADERBOARD_CACHE_GEN_KEY = 'leaderboard:cache_generation';

/** Keep generation in cache longer than leaderboard entry TTL so reads never fall back to gen 0 while old keys remain. */
export const LEADERBOARD_CACHE_GEN_TTL_MS = 365 * 24 * 60 * 60 * 1000;

export function leaderboardHttpCacheKey(
  gen: number,
  period: string,
  limit: number,
  sport: string,
): string {
  return `leaderboard:${gen}:${period}:${limit}:${sport}`;
}
