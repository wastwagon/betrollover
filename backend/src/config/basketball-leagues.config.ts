/**
 * Default enabled basketball league IDs (API-Sports).
 * NBA = 12, EuroLeague = 120, NBA G League = 20.
 * Override via ENABLED_BASKETBALL_LEAGUES env (comma-separated IDs).
 */
export const DEFAULT_BASKETBALL_LEAGUE_IDS = [12, 120, 20]; // NBA, EuroLeague, NBA G League

export function getEnabledBasketballLeagueIds(): number[] {
  const raw = process.env.ENABLED_BASKETBALL_LEAGUES;
  if (!raw?.trim()) return DEFAULT_BASKETBALL_LEAGUE_IDS;
  return raw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n > 0);
}
