import {
  isVipAllowedLeagueApiId,
  VIP_BLACKLIST_LEAGUE_API_IDS,
  VIP_CONSTRUCTIONS,
  VIP_LEG_ODD_MAX,
  VIP_LEG_ODD_MIN,
  VIP_LEG_TARGET_ODD,
  VIP_MAX_COMBINED_ODDS,
  VIP_MAX_COUPONS_PER_DAY,
  VIP_MIN_COMBINED_ODDS,
  VIP_PACKAGE_PRICE,
} from './vip-tipster.config';

describe('vip league gates', () => {
  it('allows Brazil Serie A and Championship (no whitelist)', () => {
    expect(isVipAllowedLeagueApiId(71)).toBe(true);
    expect(isVipAllowedLeagueApiId(40)).toBe(true);
  });

  it('blocks Latvia shorts', () => {
    for (const id of VIP_BLACKLIST_LEAGUE_API_IDS) {
      expect(isVipAllowedLeagueApiId(id)).toBe(false);
    }
  });

  it('prices the monthly VIP plan at GHS 300', () => {
    expect(VIP_PACKAGE_PRICE).toBe(300);
  });

  it('posts up to two Home+Home slips per desk day', () => {
    expect(VIP_MAX_COUPONS_PER_DAY).toBe(2);
    expect(VIP_CONSTRUCTIONS.map((c) => c.key)).toEqual(['home_win']);
    expect(VIP_CONSTRUCTIONS[0].outcomeKeys).toEqual(['home']);
  });

  it('lets combined odds drop two 1.20s and keep two 1.28s under 2.00', () => {
    expect(VIP_LEG_ODD_MIN * VIP_LEG_ODD_MIN).toBeLessThan(VIP_MIN_COMBINED_ODDS);
    expect(VIP_LEG_ODD_MAX * VIP_LEG_ODD_MAX).toBeLessThanOrEqual(VIP_MAX_COMBINED_ODDS);
    expect(VIP_LEG_TARGET_ODD * VIP_LEG_TARGET_ODD).toBeGreaterThanOrEqual(VIP_MIN_COMBINED_ODDS);
    expect(VIP_LEG_TARGET_ODD * VIP_LEG_TARGET_ODD).toBeLessThanOrEqual(VIP_MAX_COMBINED_ODDS);
  });
});
