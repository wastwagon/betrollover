/**
 * Wallet API response shapes (shared contract).
 */

export interface BalanceResponse {
  balance: number;
  currency: string;
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
