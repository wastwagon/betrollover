/** Shared defaults for 2-leg safe accas (high confidence, 2.0+ combined). Diagnostic/backtest only. */
export const SAFE_ACCA_DEFAULTS = {
  couponLegs: 2,
  legOddsMin: 1.5,
  legOddsMax: 1.75,
  minCombinedOdds: 2.0,
  maxCombinedOdds: 3.0,
  minJointProbability: 0.42,
} as const;

/** Personality-shaped input for acca diagnostics (live tipsters are single-fixture again). */
export interface AccaPersonalityInput {
  target_odds_min?: number;
  target_odds_max?: number;
  coupon_legs?: 1 | 2;
  leg_odds_min?: number;
  leg_odds_max?: number;
  min_combined_odds?: number;
  max_combined_odds?: number;
  min_joint_probability?: number;
  require_api_probability?: boolean;
  selection_mode?: 'ev' | 'confidence';
  major_leagues_only?: boolean;
  min_win_probability?: number;
  min_api_confidence?: number;
  min_expected_value?: number;
  risk_level?: 'conservative' | 'balanced' | 'aggressive';
  leagues_focus?: string[];
  bet_types?: string[];
  max_daily_predictions?: number;
}

/** Convenience profile for diagnostic scripts that still evaluate 2-leg pairs. */
export const SAFE_2_LEG_ACCA: AccaPersonalityInput = {
  coupon_legs: 2,
  leg_odds_min: SAFE_ACCA_DEFAULTS.legOddsMin,
  leg_odds_max: SAFE_ACCA_DEFAULTS.legOddsMax,
  min_combined_odds: SAFE_ACCA_DEFAULTS.minCombinedOdds,
  max_combined_odds: SAFE_ACCA_DEFAULTS.maxCombinedOdds,
  min_joint_probability: SAFE_ACCA_DEFAULTS.minJointProbability,
  min_win_probability: 0.52,
  min_api_confidence: 0.6,
  min_expected_value: 0,
  require_api_probability: true,
  selection_mode: 'confidence',
  major_leagues_only: true,
};

export interface AccaLegCandidate {
  fixtureId: number;
  odds: number;
  probability: number;
  fromApi?: boolean;
}

export interface ResolvedAccaPolicy {
  couponLegs: 1 | 2;
  legOddsMin: number;
  legOddsMax: number;
  minCombinedOdds: number;
  maxCombinedOdds: number;
  minJointProbability: number;
  requireApiProbability: boolean;
  selectionMode: 'ev' | 'confidence';
  skipEvFilter: boolean;
  majorLeaguesOnly: boolean;
}

export function resolveAccaPolicy(personality: AccaPersonalityInput): ResolvedAccaPolicy {
  const couponLegs = (personality.coupon_legs ?? SAFE_ACCA_DEFAULTS.couponLegs) as 1 | 2;
  const selectionMode = personality.selection_mode ?? (couponLegs === 2 ? 'confidence' : 'ev');

  if (couponLegs === 2) {
    return {
      couponLegs: 2,
      legOddsMin: personality.leg_odds_min ?? SAFE_ACCA_DEFAULTS.legOddsMin,
      legOddsMax: personality.leg_odds_max ?? SAFE_ACCA_DEFAULTS.legOddsMax,
      minCombinedOdds: personality.min_combined_odds ?? SAFE_ACCA_DEFAULTS.minCombinedOdds,
      maxCombinedOdds: personality.max_combined_odds ?? SAFE_ACCA_DEFAULTS.maxCombinedOdds,
      minJointProbability: personality.min_joint_probability ?? SAFE_ACCA_DEFAULTS.minJointProbability,
      requireApiProbability: personality.require_api_probability ?? true,
      selectionMode,
      skipEvFilter: selectionMode === 'confidence',
      majorLeaguesOnly: personality.major_leagues_only !== false,
    };
  }

  return {
    couponLegs: 1,
    legOddsMin: personality.target_odds_min ?? 2.0,
    legOddsMax: personality.target_odds_max ?? 5.0,
    minCombinedOdds: personality.target_odds_min ?? 2.0,
    maxCombinedOdds: personality.target_odds_max ?? 5.0,
    minJointProbability: personality.min_joint_probability ?? 0,
    requireApiProbability: personality.require_api_probability ?? false,
    selectionMode,
    skipEvFilter: false,
    majorLeaguesOnly: false,
  };
}

/**
 * Best 2-leg pair by joint API probability (independent estimate).
 * Both legs must be different fixtures; combined odds within policy band.
 */
export function findSafest2LegPair<T extends AccaLegCandidate>(
  suitable: T[],
  policy: ResolvedAccaPolicy,
): [T, T] | null {
  if (policy.couponLegs !== 2 || suitable.length < 2) return null;

  let best: { legs: [T, T]; jointProb: number } | null = null;

  for (let i = 0; i < suitable.length; i++) {
    for (let j = i + 1; j < suitable.length; j++) {
      const a = suitable[i];
      const b = suitable[j];
      if (a.fixtureId === b.fixtureId) continue;
      if (policy.requireApiProbability && (!a.fromApi || !b.fromApi)) continue;

      const combined = a.odds * b.odds;
      if (combined < policy.minCombinedOdds || combined > policy.maxCombinedOdds) continue;

      const joint = a.probability * b.probability;
      if (joint < policy.minJointProbability) continue;

      if (!best || joint > best.jointProb) {
        best = { legs: [a, b], jointProb: joint };
      }
    }
  }

  return best?.legs ?? null;
}
