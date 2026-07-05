import type { AiTipsterPersonality } from '../../config/ai-tipsters.config';

/** Shared defaults for 2-leg safe accas (high confidence, 2.0+ combined). */
export const SAFE_ACCA_DEFAULTS = {
  couponLegs: 2,
  legOddsMin: 1.28,
  legOddsMax: 1.85,
  minCombinedOdds: 2.0,
  maxCombinedOdds: 3.5,
  minJointProbability: 0.42,
} as const;

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

export function resolveAccaPolicy(personality: AiTipsterPersonality): ResolvedAccaPolicy {
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
    legOddsMin: personality.target_odds_min,
    legOddsMax: personality.target_odds_max,
    minCombinedOdds: personality.target_odds_min,
    maxCombinedOdds: personality.target_odds_max,
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
