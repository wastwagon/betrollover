import { vipPeriodShouldRefundForNoDelivery } from './subscription-settlement.logic';

describe('vipPeriodShouldRefundForNoDelivery', () => {
  it('refunds when the tipster posted no VIP slips', () => {
    expect(vipPeriodShouldRefundForNoDelivery(0)).toBe(true);
  });

  it('pays the period-end split once at least one VIP slip was posted', () => {
    expect(vipPeriodShouldRefundForNoDelivery(1)).toBe(false);
    expect(vipPeriodShouldRefundForNoDelivery(2)).toBe(false);
  });
});
