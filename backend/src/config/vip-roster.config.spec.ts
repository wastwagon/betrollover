import {
  FORMER_VIP_ROSTER_USERNAMES,
  VIP_PACKAGE_OWNER_USERNAME,
  VIP_ROSTER_USERNAMES,
  isVipRosterUsername,
  vipRosterUsernameSqlList,
} from './vip-roster.config';

describe('VIP roster', () => {
  it('keeps AccaSure1X2 as the only VIP tipster and package owner', () => {
    expect(VIP_ROSTER_USERNAMES).toEqual(['AccaSure1X2']);
    expect(VIP_PACKAGE_OWNER_USERNAME).toBe('AccaSure1X2');
    expect(FORMER_VIP_ROSTER_USERNAMES).toEqual(['TheAnalyst', 'LateBloomer']);
    expect(isVipRosterUsername('AccaSure1X2')).toBe(true);
    expect(isVipRosterUsername('theanalyst')).toBe(false);
    expect(isVipRosterUsername('LateBloomer')).toBe(false);
    expect(isVipRosterUsername('SureTwoFold')).toBe(false);
    expect(isVipRosterUsername('AccaSureTwoFold')).toBe(false);
  });

  it('embeds roster usernames for public-list SQL', () => {
    expect(vipRosterUsernameSqlList()).toBe("'accasure1x2'");
  });
});
