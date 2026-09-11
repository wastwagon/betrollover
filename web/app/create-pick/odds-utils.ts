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

/** Football market display order (Tier 1 first, then Tier 2, then common extras) */
const FOOTBALL_MARKET_ORDER = [
  'Match Winner',
  'Goals Over/Under',
  'Both Teams To Score',
  'Double Chance',
  'Draw No Bet',
  'Odd/Even',
  'First Half Winner',
  'Goals Over/Under First Half',
  'Half-Time/Full-Time',
  'Asian Handicap',
  'European Handicap',
  'Corners Over/Under',
  'Home Corners Over/Under',
  'Away Corners Over/Under',
  'Corners 1X2',
  'Corners Asian Handicap',
  'Corners Odd/Even',
  'Cards Over/Under',
  'Yellow Cards',
  'Booking Points',
  'Correct Score',
];

/**
 * Markets we may still have in DB from older syncs but must not offer for picks —
 * settlement lacks race events / period corner totals.
 */
export function isPickMarketSupported(marketName: string): boolean {
  const n = (marketName || '').trim().toLowerCase();
  if (!n) return false;
  if (n.includes('corner') && n.includes('race')) return false;
  if (
    n.includes('corner') &&
    (n.includes('1st half') ||
      n.includes('2nd half') ||
      n.includes('first half') ||
      n.includes('second half'))
  ) {
    return false;
  }
  return true;
}

export type OrderedMarketNamesOptions = {
  /** Preferred order; defaults to football Create Pick order. */
  preferredOrder?: string[];
  /** Extra filter (default: football unsupported-market guard). Pass `() => true` for other sports. */
  isSupported?: (marketName: string) => boolean;
};

/**
 * Ordered market names present in `grouped`: preferred order first, then remaining A→Z.
 */
export function orderedMarketNames(
  grouped: Record<string, FixtureOdd[]>,
  options?: OrderedMarketNamesOptions,
): string[] {
  const preferred = options?.preferredOrder ?? FOOTBALL_MARKET_ORDER;
  const isSupported = options?.isSupported ?? isPickMarketSupported;
  const known = preferred.filter((m) => grouped[m]?.length && isSupported(m));
  const rest = Object.keys(grouped)
    .filter((m) => !preferred.includes(m) && grouped[m]?.length && isSupported(m))
    .sort((a, b) => a.localeCompare(b));
  return [...known, ...rest];
}

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
