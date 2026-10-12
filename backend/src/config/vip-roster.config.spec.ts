import {
  VIP_PACKAGE_OWNER_USERNAME,
  VIP_ROSTER_USERNAMES,
  isVipRosterUsername,
  vipRosterUsernameSqlList,
} from './vip-roster.config';

describe('VIP roster', () => {
  it('puts three tipsters on VIP and gives the package to AccaSure1X2', () => {
    expect(VIP_ROSTER_USERNAMES).toEqual(['TheAnalyst', 'LateBloomer', 'AccaSure1X2']);
    expect(VIP_PACKAGE_OWNER_USERNAME).toBe('AccaSure1X2');
    expect(isVipRosterUsername('AccaSure1X2')).toBe(true);
    expect(isVipRosterUsername('theanalyst')).toBe(true);
    expect(isVipRosterUsername('LateBloomer')).toBe(true);
    expect(isVipRosterUsername('SureTwoFold')).toBe(false);
    expect(isVipRosterUsername('AccaSureTwoFold')).toBe(false);
  });

  it('embeds roster usernames for public-list SQL', () => {
    expect(vipRosterUsernameSqlList()).toBe("'theanalyst', 'latebloomer', 'accasure1x2'");
  });
});
