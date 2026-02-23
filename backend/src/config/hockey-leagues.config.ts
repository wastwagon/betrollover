/**
 * Default enabled hockey league IDs (API-Sports).
 * Override via ENABLED_HOCKEY_LEAGUES env (comma-separated IDs).
 * Verify IDs in dashboard.api-football.com → Hockey.
 */
export const DEFAULT_HOCKEY_LEAGUE_IDS = [57, 58, 59]; // NHL, etc.; verify in dashboard.

export function getEnabledHockeyLeagueIds(): number[] {
  const raw = process.env.ENABLED_HOCKEY_LEAGUES;
  if (!raw?.trim()) return DEFAULT_HOCKEY_LEAGUE_IDS;
  return raw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n > 0);
}
