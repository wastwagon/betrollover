/**
 * Default enabled volleyball league IDs (API-Sports).
 * Override via ENABLED_VOLLEYBALL_LEAGUES env (comma-separated IDs).
 * Verify IDs in dashboard.api-football.com → Volleyball.
 */
export const DEFAULT_VOLLEYBALL_LEAGUE_IDS = [23, 24, 25]; // Major leagues; verify in dashboard.

export function getEnabledVolleyballLeagueIds(): number[] {
  const raw = process.env.ENABLED_VOLLEYBALL_LEAGUES;
  if (!raw?.trim()) return DEFAULT_VOLLEYBALL_LEAGUE_IDS;
  return raw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n > 0);
}
