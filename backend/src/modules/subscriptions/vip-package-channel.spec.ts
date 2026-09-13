import { HUMAN_VIP_INCLUDED_SLIPS_PER_PERIOD, vipPackageDeliveryMeta } from './vip-package-channel';

describe('vipPackageDeliveryMeta', () => {
  it('marks the house desk as Telegram daily delivery', () => {
    expect(vipPackageDeliveryMeta('vip_desk')).toEqual({
      channel: 'house',
      delivery: 'telegram',
      includedSlipsPerPeriod: null,
    });
  });

  it('marks independent tipsters as in-app with a posted-slip cap', () => {
    expect(vipPackageDeliveryMeta('human')).toEqual({
      channel: 'tipster',
      delivery: 'in_app',
      includedSlipsPerPeriod: HUMAN_VIP_INCLUDED_SLIPS_PER_PERIOD,
    });
    expect(vipPackageDeliveryMeta(null).channel).toBe('tipster');
  });
});
