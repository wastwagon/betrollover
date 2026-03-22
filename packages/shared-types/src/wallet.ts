/**
 * Wallet API response shapes (shared contract).
 */

export interface BalanceResponse {
  balance: number;
  currency: string;
}

/**
 * GET /wallet/coupon-spend-summary
 * Net on coupons uses pick-related refunds only; subscription/other refunds are broken out separately.
 */
export interface CouponSpendSummaryResponse {
  grossCouponPurchases: number;
  couponRefundsToWallet: number;
  netOutOfPocketOnCoupons: number;
  /** Refund credits with reference sub-* (e.g. ROI guarantee). */
  subscriptionRefundsToWallet: number;
  /** Remaining completed refund credits (e.g. withdrawal reversal, admin). */
  otherRefundsToWallet: number;
}

export interface IapProduct {
  productId: string;
  amountGhs: number;
  label: string;
}

export interface IapVerifyResponse {
  credited: boolean;
  amount: number;
}
