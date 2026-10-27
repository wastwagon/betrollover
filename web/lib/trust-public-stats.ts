import { getApiUrl } from '@/lib/site-config';

export type TrustPublicStats = {
  verifiedTipsters: number;
  totalPicks: number;
  settledWon: number;
  settledLost: number;
  activePicks: number;
  successfulPurchases: number;
  winRate: number;
  totalPaidOut: number;
  purchaseProtectionRefundsGhs: number;
  purchaseProtectionRefundCount: number;
};

export async function fetchTrustPublicStats(options?: { revalidate?: number }): Promise<TrustPublicStats | null> {
  const init: RequestInit =
    options?.revalidate != null ? { next: { revalidate: options.revalidate } } : { cache: 'no-store' };
  try {
    const res = await fetch(`${getApiUrl()}/accumulators/stats/public`, init);
    if (!res.ok) return null;
    const o = (await res.json()) as Record<string, unknown>;
    return {
      verifiedTipsters: Number(o.verifiedTipsters) || 0,
      totalPicks: Number(o.totalPicks) || 0,
      settledWon: Number(o.settledWon) || 0,
      settledLost: Number(o.settledLost) || 0,
      activePicks: Number(o.activePicks) || 0,
      successfulPurchases: Number(o.successfulPurchases) || 0,
      winRate: Number(o.winRate) || 0,
      totalPaidOut: Number(o.totalPaidOut) || 0,
      purchaseProtectionRefundsGhs: Number(o.purchaseProtectionRefundsGhs) || 0,
      purchaseProtectionRefundCount: Number(o.purchaseProtectionRefundCount) || 0,
    };
  } catch {
    return null;
  }
}
