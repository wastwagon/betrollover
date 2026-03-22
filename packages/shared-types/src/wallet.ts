/**
 * Wallet API response shapes (shared contract).
 */

export interface BalanceResponse {
  balance: number;
  currency: string;
}

/** GET /wallet/coupon-spend-summary — marketplace picks only (reference pick-*). */
export interface CouponSpendSummaryResponse {
  grossCouponPurchases: number;
  couponRefundsToWallet: number;
  netOutOfPocketOnCoupons: number;
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
