import { findSafest2LegPair, resolveAccaPolicy, SAFE_ACCA_DEFAULTS } from './safe-acca.util';

describe('resolveAccaPolicy', () => {
  it('defaults to 2-leg confidence mode', () => {
    const p = resolveAccaPolicy({});
    expect(p.couponLegs).toBe(2);
    expect(p.selectionMode).toBe('confidence');
    expect(p.skipEvFilter).toBe(true);
    expect(p.legOddsMin).toBe(SAFE_ACCA_DEFAULTS.legOddsMin);
  });

  it('uses single-leg target odds when coupon_legs is 1', () => {
    const p = resolveAccaPolicy({
      coupon_legs: 1,
      target_odds_min: 2.5,
      target_odds_max: 5,
    });
    expect(p.couponLegs).toBe(1);
    expect(p.legOddsMin).toBe(2.5);
    expect(p.skipEvFilter).toBe(false);
  });
});

describe('findSafest2LegPair', () => {
  const policy = resolveAccaPolicy({
    coupon_legs: 2,
    leg_odds_min: 1.3,
    leg_odds_max: 1.8,
    min_combined_odds: 2.0,
    max_combined_odds: 3.5,
    min_joint_probability: 0.4,
    require_api_probability: true,
  });

  const legs = [
    { fixtureId: 1, odds: 1.45, probability: 0.7, fromApi: true },
    { fixtureId: 2, odds: 1.5, probability: 0.68, fromApi: true },
    { fixtureId: 3, odds: 1.4, probability: 0.55, fromApi: true },
    { fixtureId: 4, odds: 1.45, probability: 0.72, fromApi: false },
  ];

  it('picks highest joint probability pair with API data', () => {
    const pair = findSafest2LegPair(legs, policy);
    expect(pair).not.toBeNull();
    expect(pair![0].fixtureId).toBe(1);
    expect(pair![1].fixtureId).toBe(2);
    expect(pair![0].odds * pair![1].odds).toBeGreaterThanOrEqual(2.0);
  });

  it('returns null when combined odds too low', () => {
    const low = [
      { fixtureId: 1, odds: 1.2, probability: 0.8, fromApi: true },
      { fixtureId: 2, odds: 1.25, probability: 0.8, fromApi: true },
    ];
    expect(findSafest2LegPair(low, policy)).toBeNull();
  });
});
