import type { FixtureOdd } from './types';

/** Group odds by market type for display */
export function groupOddsByMarket(odds: FixtureOdd[]): Record<string, FixtureOdd[]> {
  const grouped: Record<string, FixtureOdd[]> = {};
  for (const odd of odds) {
    if (!grouped[odd.marketName]) {
      grouped[odd.marketName] = [];
    }
    grouped[odd.marketName].push(odd);
  }
  return grouped;
}

/** Market display order (Tier 1 first, then Tier 2) */
export const MARKET_ORDER = [
  'Match Winner',
  'Goals Over/Under',
  'Both Teams To Score',
  'Double Chance',
  'Half-Time/Full-Time',
  'Correct Score',
];

/** Common Correct Score options only (excludes rare scores like 10:0, 9:9) */
const CORRECT_SCORE_ALLOWED = new Set([
  '0-0', '0:0', '1-0', '1:0', '0-1', '0:1', '1-1', '1:1',
  '2-0', '2:0', '0-2', '0:2', '2-1', '2:1', '1-2', '1:2', '2-2', '2:2',
  '3-0', '3:0', '0-3', '0:3', '3-1', '3:1', '1-3', '1:3', '3-2', '3:2', '2-3', '2:3',
]);

export function filterCorrectScoreOdds(odds: FixtureOdd[]): FixtureOdd[] {
  return odds.filter((o) => {
    const val = (o.marketValue || '').trim().replace(/:/g, '-');
    return CORRECT_SCORE_ALLOWED.has(val);
  });
}
