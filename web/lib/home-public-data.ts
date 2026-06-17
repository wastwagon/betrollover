import { getApiUrl } from '@/lib/site-config';
import { LEADERBOARD_MIN_SETTLED_FOR_PRIMARY_RANKING } from '@betrollover/shared-types';

export interface HomePublicStats {
  verifiedTipsters: number;
  totalPicks: number;
  activePicks: number;
  successfulPurchases: number;
  winRate: number;
  totalPaidOut: number;
}

export interface HomePublicData {
  stats: HomePublicStats | null;
  leadingRoi: number | null;
  topTipsters: Record<string, unknown>[];
  marketplaceItems: Record<string, unknown>[];
  featuredPicks: Record<string, unknown>[];
  freeTip: Record<string, unknown> | null;
}

function parseStats(data: unknown): HomePublicStats | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  return {
    verifiedTipsters: Number(o.verifiedTipsters) || 0,
    totalPicks: Number(o.totalPicks) || 0,
    activePicks: Number(o.activePicks) || 0,
    successfulPurchases: Number(o.successfulPurchases) || 0,
    winRate: Number(o.winRate) || 0,
    totalPaidOut: Number(o.totalPaidOut) || 0,
  };
}

function leadingRoiFromLeaderboard(data: unknown): number | null {
  const entries = (data as { leaderboard?: unknown[] })?.leaderboard;
  if (!Array.isArray(entries)) return null;
  const settled = (e: Record<string, unknown>) =>
    (Number(e.total_wins) || 0) + (Number(e.total_losses) || 0);
  const top = entries.find(
    (e) => settled(e as Record<string, unknown>) >= LEADERBOARD_MIN_SETTLED_FOR_PRIMARY_RANKING,
  ) as Record<string, unknown> | undefined;
  if (!top || typeof top.roi !== 'number') return null;
  return top.roi;
}

/** Server-safe fetch for homepage trust metrics and teasers. */
export async function fetchHomePublicData(options?: { revalidate?: number }): Promise<HomePublicData> {
  const api = getApiUrl();
  const init: RequestInit =
    options?.revalidate != null ? { next: { revalidate: options.revalidate } } : { cache: 'no-store' };

  const empty: HomePublicData = {
    stats: null,
    leadingRoi: null,
    topTipsters: [],
    marketplaceItems: [],
    featuredPicks: [],
    freeTip: null,
  };

  try {
    const [statsRes, lbRes, marketRes, featuredRes, freeTipRes] = await Promise.all([
      fetch(`${api}/accumulators/stats/public`, init),
      fetch(`${api}/leaderboard?period=all_time&limit=24`, init),
      fetch(`${api}/accumulators/marketplace/public?limit=48`, init),
      fetch(`${api}/accumulators/featured`, init),
      fetch(`${api}/accumulators/free-tip-of-the-day`, init),
    ]);

    const statsJson = statsRes.ok ? await statsRes.json() : null;
    const lbJson = lbRes.ok ? await lbRes.json() : { leaderboard: [] };
    const marketJson = marketRes.ok ? await marketRes.json() : { items: [] };
    const featuredJson = featuredRes.ok ? await featuredRes.json() : [];
    const freeTipJson = freeTipRes.ok ? await freeTipRes.json() : null;

    const topTipsters = Array.isArray(lbJson?.leaderboard) ? lbJson.leaderboard : [];
    const marketplaceItems = Array.isArray(marketJson?.items) ? marketJson.items : [];
    const featuredPicks = Array.isArray(featuredJson) ? featuredJson : [];

    return {
      stats: parseStats(statsJson),
      leadingRoi: leadingRoiFromLeaderboard(lbJson),
      topTipsters,
      marketplaceItems,
      featuredPicks,
      freeTip: freeTipJson && typeof freeTipJson === 'object' ? (freeTipJson as Record<string, unknown>) : null,
    };
  } catch {
    return empty;
  }
}
