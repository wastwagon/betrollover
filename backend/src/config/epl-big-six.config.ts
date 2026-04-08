/**
 * EPL "Big 6" club name matching for AI tipster team_filter: ['top_6'].
 * Matches API-Football / common bookmaker team strings (substring-safe, avoids bare "United").
 */

export function isLikelyEplBigSixTeam(teamName: string): boolean {
  const n = teamName.toLowerCase().trim();
  if (!n) return false;

  if (/\b(tottenham|spurs)\b/.test(n)) return true;
  if (/\b(arsenal)\b/.test(n)) return true;
  if (/\b(chelsea)\b/.test(n)) return true;
  if (/\b(liverpool)\b/.test(n)) return true;
  if (/\b(manchester city|man\.?\s*city)\b/.test(n)) return true;
  if (/\b(manchester united|man\.?\s*united|man\.?\s*utd)\b/.test(n)) return true;

  return false;
}

/** True if either side is a Big 6 club (any fixture involving them). */
export function fixtureInvolvesBigSix(homeTeam: string, awayTeam: string): boolean {
  return isLikelyEplBigSixTeam(homeTeam) || isLikelyEplBigSixTeam(awayTeam);
}
