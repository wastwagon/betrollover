/**
 * API-Football bet names vary by bookmaker. Map raw `bet.name` → canonical market keys
 * that match `market_config.market_name` and settlement/display code.
 */
export const API_MARKET_ALIASES: Record<string, string> = {
  // Both Teams To Score (BTTS / GG)
  'Both Teams To Score': 'Both Teams To Score',
  'Goals - Both Teams Score': 'Both Teams To Score',
  'Both Teams Score': 'Both Teams To Score',
  BTTS: 'Both Teams To Score',
  GG: 'Both Teams To Score',
  'Both Teams To Score - Yes/No': 'Both Teams To Score',
  // Home / Away team to score
  'Home Team Score a Goal': 'Home Team Score a Goal',
  'Home Team To Score': 'Home Team Score a Goal',
  'Goals - Home Team To Score': 'Home Team Score a Goal',
  'Away Team Score a Goal': 'Away Team Score a Goal',
  'Away Team To Score': 'Away Team Score a Goal',
  'Goals - Away Team To Score': 'Away Team Score a Goal',
  // Correct Score
  'Correct Score': 'Correct Score',
  'Exact Score': 'Correct Score',
  Score: 'Correct Score',
  // Half-Time/Full-Time (HT/FT)
  'Half-Time/Full-Time': 'Half-Time/Full-Time',
  'HT/FT': 'Half-Time/Full-Time',
  'Half Time/Full Time': 'Half-Time/Full-Time',
  'Half Time - Full Time': 'Half-Time/Full-Time',
  'Double Result': 'Half-Time/Full-Time',
  'Result at Half-Time/Full-Time': 'Half-Time/Full-Time',
  // Match Winner (1X2)
  'Match Winner': 'Match Winner',
  'Home/Away': 'Match Winner',
  '1X2': 'Match Winner',
  // Goals Over/Under
  'Goals Over/Under': 'Goals Over/Under',
  'Over/Under': 'Goals Over/Under',
  'Total Goals': 'Goals Over/Under',
  // Double Chance
  'Double Chance': 'Double Chance',
  // Draw No Bet
  'Draw No Bet': 'Draw No Bet',
  DNB: 'Draw No Bet',
  // Odd / Even (full match goals)
  'Odd/Even': 'Odd/Even',
  'Goals Odd/Even': 'Odd/Even',
  'Even/Odd': 'Odd/Even',
  // First half
  'First Half Winner': 'First Half Winner',
  'Half Time Winner': 'First Half Winner',
  'Half Time Result': 'First Half Winner',
  '1st Half Winner': 'First Half Winner',
  'Goals Over/Under First Half': 'Goals Over/Under First Half',
  'Goals Over/Under - First Half': 'Goals Over/Under First Half',
  'First Half Goals Over/Under': 'Goals Over/Under First Half',
  // Handicap
  'Asian Handicap': 'Asian Handicap',
  'Asian Handicap (Asians)': 'Asian Handicap',
  'European Handicap': 'European Handicap',
  'Handicap Result': 'European Handicap',
  '3-Way Handicap': 'European Handicap',
  // Corners (common API / bookmaker spellings → stable labels for create-pick)
  'Corners Over Under': 'Corners Over/Under',
  'Corners Over/Under': 'Corners Over/Under',
  'Total Corners': 'Corners Over/Under',
  'Corner Over Under': 'Corners Over/Under',
  'Home Corners Over/Under': 'Home Corners Over/Under',
  'Away Corners Over/Under': 'Away Corners Over/Under',
  'Corners 1x2': 'Corners 1X2',
  'Corners 1X2': 'Corners 1X2',
  'Corner Match Bet': 'Corners 1X2',
  'Corners Asian Handicap': 'Corners Asian Handicap',
  'Corners. Asian Handicap': 'Corners Asian Handicap',
  // Race To / 1H–2H aliases omitted — denied in MarketFilterService (no settle inputs)
  'Corners. Odd/Even': 'Corners Odd/Even',
  'Corners Odd/Even': 'Corners Odd/Even',
  Multicorners: 'Corners Over/Under',
  'Multi Corners': 'Corners Over/Under',
  multicorners: 'Corners Over/Under',
  // Cards
  'Cards Over/Under': 'Cards Over/Under',
  'Total Cards': 'Cards Over/Under',
  'Booking Points': 'Booking Points',
  'Yellow Cards': 'Yellow Cards',
};

export function normalizeApiMarketName(apiName: string): string {
  const trimmed = (apiName || '').trim();
  return API_MARKET_ALIASES[trimmed] ?? trimmed;
}
