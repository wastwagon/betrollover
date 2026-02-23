/**
 * Default enabled American Football league IDs (API-Sports).
 * Override via ENABLED_AMERICAN_FOOTBALL_LEAGUES env (comma-separated IDs).
 */
export const DEFAULT_AMERICAN_FOOTBALL_LEAGUE_IDS = [1, 2];

export function getEnabledAmericanFootballLeagueIds(): number[] {
  const raw = process.env.ENABLED_AMERICAN_FOOTBALL_LEAGUES;
  if (!raw?.trim()) return DEFAULT_AMERICAN_FOOTBALL_LEAGUE_IDS;
  return raw.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n) && n > 0);
}
