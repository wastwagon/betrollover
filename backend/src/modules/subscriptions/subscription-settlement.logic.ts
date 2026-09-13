/** Full refund when the period produced no included VIP slips. Losing slips still settle 70/30. */
export function vipPeriodShouldRefundForNoDelivery(postedVipSlips: number): boolean {
  return postedVipSlips < 1;
}
