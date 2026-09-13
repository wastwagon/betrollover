import {
  isVipAllowedLeagueApiId,
  isVipBrazilOver15League,
  VIP_BLACKLIST_LEAGUE_API_IDS,
  VIP_LEG_ODD_MAX,
  VIP_LEG_ODD_MIN,
  VIP_LEG_TARGET_ODD,
  VIP_MAX_COMBINED_ODDS,
  VIP_MIN_COMBINED_ODDS,
  VIP_PACKAGE_PRICE,
} from './vip-tipster.config';

describe('vip league gates', () => {
  it('allows Brazil Serie A and Championship', () => {
    expect(isVipAllowedLeagueApiId(71)).toBe(true);
    expect(isVipAllowedLeagueApiId(40)).toBe(true);
  });

  it('blocks Argentina Liga Profesional and MLS', () => {
    for (const id of VIP_BLACKLIST_LEAGUE_API_IDS) {
      expect(isVipAllowedLeagueApiId(id)).toBe(false);
    }
  });

  it('limits Over 1.5 to Brazil A/B', () => {
    expect(isVipBrazilOver15League(71)).toBe(true);
    expect(isVipBrazilOver15League(72)).toBe(true);
    expect(isVipBrazilOver15League(40)).toBe(false);
  });

  it('prices the monthly VIP plan at GHS 300', () => {
    expect(VIP_PACKAGE_PRICE).toBe(300);
  });

  it('lets the combined-odds gate drop stacked shorts and two long 1X prices', () => {
    expect(VIP_LEG_ODD_MIN * VIP_LEG_ODD_MIN).toBeLessThan(VIP_MIN_COMBINED_ODDS);
    expect(VIP_LEG_ODD_MAX * VIP_LEG_ODD_MAX).toBeGreaterThan(VIP_MAX_COMBINED_ODDS);
    expect(VIP_LEG_ODD_MIN * VIP_LEG_TARGET_ODD).toBeGreaterThanOrEqual(VIP_MIN_COMBINED_ODDS);
  });
});
