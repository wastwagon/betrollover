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
};

export function normalizeApiMarketName(apiName: string): string {
  const trimmed = (apiName || '').trim();
  return API_MARKET_ALIASES[trimmed] ?? trimmed;
}
