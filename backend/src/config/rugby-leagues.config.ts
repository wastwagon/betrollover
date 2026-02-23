/**
 * Default enabled rugby league IDs (API-Sports).
 * Override via ENABLED_RUGBY_LEAGUES env (comma-separated IDs).
 */
export const DEFAULT_RUGBY_LEAGUE_IDS = [27, 1, 2]; // Top League (Japan), etc. Verify in dashboard.

export function getEnabledRugbyLeagueIds(): number[] {
  const raw = process.env.ENABLED_RUGBY_LEAGUES;
  if (!raw?.trim()) return DEFAULT_RUGBY_LEAGUE_IDS;
  return raw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n > 0);
}
