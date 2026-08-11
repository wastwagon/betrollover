/**
 * Acca Generator market catalog (football).
 * Keys are user-facing filter IDs; outcomeKeys map to odds-outcome-keys / settlement.
 */

export type AccaMarketDef = {
  key: string;
  label: string;
  /** Canonical outcome keys allowed when this market is selected */
  outcomeKeys: readonly string[];
};

export const ACCA_GENERATOR_MARKETS: readonly AccaMarketDef[] = [
  { key: 'match_winner', label: '1X2 (Match Winner)', outcomeKeys: ['home', 'draw', 'away'] },
  { key: 'double_chance', label: 'Double Chance', outcomeKeys: ['home_draw', 'draw_away', 'home_away'] },
  { key: 'btts', label: 'Both Teams To Score (Yes)', outcomeKeys: ['btts'] },
  { key: 'over15', label: 'Over 1.5 Goals', outcomeKeys: ['over15'] },
  { key: 'under15', label: 'Under 1.5 Goals', outcomeKeys: ['under15'] },
  { key: 'over25', label: 'Over 2.5 Goals', outcomeKeys: ['over25'] },
  { key: 'under25', label: 'Under 2.5 Goals', outcomeKeys: ['under25'] },
  { key: 'over35', label: 'Over 3.5 Goals', outcomeKeys: ['over35'] },
  { key: 'under35', label: 'Under 3.5 Goals', outcomeKeys: ['under35'] },
  { key: 'dnb', label: 'Draw No Bet', outcomeKeys: ['dnb_home', 'dnb_away'] },
  { key: 'fh_winner', label: '1st Half Winner', outcomeKeys: ['ht_home', 'ht_draw', 'ht_away'] },
  { key: 'fh_over15', label: '1st Half Over 1.5', outcomeKeys: ['fh_over15'] },
  { key: 'fh_under15', label: '1st Half Under 1.5', outcomeKeys: ['fh_under15'] },
] as const;

export const ACCA_GENERATOR_MARKET_KEYS = new Set(ACCA_GENERATOR_MARKETS.map((m) => m.key));

export const DEFAULT_ACCA_MARKETS = ['over25', 'btts', 'double_chance', 'match_winner'] as const;

export type AccaRiskLevel = 'sure' | 'safe' | 'medium' | 'high';

export type AccaRiskProfile = {
  key: AccaRiskLevel;
  label: string;
  description: string;
  /** Inclusive per-leg odd floor */
  oddMin: number;
  /** Inclusive per-leg odd ceiling */
  oddMax: number;
  /** Preferred mid of band — used so slips don’t all pin to the floor */
  targetOdd: number;
};

/**
 * Risk bands (per leg).
 * Sure = ultra-short favorites (often DC / O1.5) for maxi-style small combines.
 * Safe / Medium / High keep their prior bands so existing user behaviour is unchanged.
 */
export const ACCA_RISK_PROFILES: readonly AccaRiskProfile[] = [
  {
    key: 'sure',
    label: 'Sure',
    description:
      'Shortest per-leg prices — often favorites / DC / totals. Higher hit-rate per leg; still not guaranteed.',
    oddMin: 1.2,
    oddMax: 1.4,
    targetOdd: 1.28,
  },
  {
    key: 'safe',
    label: 'Safe',
    description: 'Shorter per-leg prices — steadier singles, still multiplies with more fixtures.',
    oddMin: 1.4,
    oddMax: 1.75,
    targetOdd: 1.55,
  },
  {
    key: 'medium',
    label: 'Medium',
    description: 'Balanced per-leg prices — mix of value and hit-rate.',
    oddMin: 1.7,
    oddMax: 2.4,
    targetOdd: 2.0,
  },
  {
    key: 'high',
    label: 'High',
    description: 'Longer per-leg prices — bigger upside, lower hit-rate per leg.',
    oddMin: 2.2,
    oddMax: 3.8,
    targetOdd: 2.8,
  },
] as const;

/** Default to Safe (not Sure): short-ish prices without implying a must-win first impression. */
export const DEFAULT_ACCA_RISK: AccaRiskLevel = 'safe';

/** Best-practice defaults for first-time UI. */
export const ACCA_GENERATOR_DEFAULTS = {
  riskLevel: DEFAULT_ACCA_RISK,
  legs: 4,
  markets: [...DEFAULT_ACCA_MARKETS],
} as const;

export function resolveRiskProfile(riskLevel?: string | null): AccaRiskProfile {
  const key = String(riskLevel || DEFAULT_ACCA_RISK).toLowerCase() as AccaRiskLevel;
  return (
    ACCA_RISK_PROFILES.find((p) => p.key === key) ??
    ACCA_RISK_PROFILES.find((p) => p.key === DEFAULT_ACCA_RISK)!
  );
}

export function outcomeKeysForMarkets(marketKeys: string[]): Set<string> {
  const out = new Set<string>();
  for (const key of marketKeys) {
    const def = ACCA_GENERATOR_MARKETS.find((m) => m.key === key);
    if (!def) continue;
    for (const ok of def.outcomeKeys) out.add(ok);
  }
  return out;
}

/** Group outcomes so slips don’t stack four identical market types. */
export function outcomeFamily(outcomeKey: string): string {
  const k = outcomeKey.toLowerCase();
  if (k === 'home' || k === 'draw' || k === 'away') return '1x2';
  if (k === 'home_draw' || k === 'draw_away' || k === 'home_away') return 'dc';
  if (k === 'btts') return 'btts';
  if (k.startsWith('over') || k.startsWith('under') || k.startsWith('fh_over') || k.startsWith('fh_under')) {
    return 'totals';
  }
  if (k.startsWith('dnb_')) return 'dnb';
  if (k.startsWith('ht_')) return 'fh_1x2';
  return 'other';
}
