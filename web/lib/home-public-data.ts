import { getApiUrl } from '@/lib/site-config';
import { hasPrimaryLeaderboardSample } from '@/lib/leaderboard-sample';
import {
  FOOTBALL_SPORT_KEY,
  isDiscoverySportAllowed,
  isFootballOnlyDiscovery,
} from '@/lib/football-only-discovery';
import { freeTipOfTheDayQuery, parseFreeTipItems } from '@/lib/free-tip-of-the-day';
import {
  parseHeadlineMatchesPayload,
  type TodayMatchRow,
} from '@/lib/home-today-matches';

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
  freeTips: Record<string, unknown>[];
  todayMatches: TodayMatchRow[];
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
  const top = entries.find((e) =>
    hasPrimaryLeaderboardSample(e as Record<string, unknown>),
  ) as Record<string, unknown> | undefined;
  if (!top || typeof top.roi !== 'number') return null;
  return top.roi;
}

/** Home modules should not lead with low-sample tipsters (secondary leaderboard band). */
function primaryRankedTipsters(entries: Record<string, unknown>[]): Record<string, unknown>[] {
  return entries.filter((e) => hasPrimaryLeaderboardSample(e));
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
    freeTips: [],
    todayMatches: [],
  };

  try {
    const footballOnly = isFootballOnlyDiscovery();
    const marketQs = footballOnly
      ? `limit=48&sport=${FOOTBALL_SPORT_KEY}`
      : 'limit=48';

    const [statsRes, lbRes, marketRes, featuredRes, freeTipRes, headlineRes] = await Promise.all([
      fetch(`${api}/accumulators/stats/public`, init),
      fetch(`${api}/leaderboard?period=all_time&limit=50`, init),
      fetch(`${api}/accumulators/marketplace/public?${marketQs}`, init),
      fetch(`${api}/accumulators/featured`, init),
      fetch(`${api}/accumulators/free-tip-of-the-day?${freeTipOfTheDayQuery()}`, init),
      fetch(`${api}/fixtures/platform/headline-matches?limit=8`, init),
    ]);

    const statsJson = statsRes.ok ? await statsRes.json() : null;
    const lbJson = lbRes.ok ? await lbRes.json() : { leaderboard: [] };
    const marketJson = marketRes.ok ? await marketRes.json() : { items: [] };
    const featuredJson = featuredRes.ok ? await featuredRes.json() : [];
    const freeTipJson = freeTipRes.ok ? await freeTipRes.json() : null;
    const headlineJson = headlineRes.ok ? await headlineRes.json() : null;

    const topTipsters = primaryRankedTipsters(
      Array.isArray(lbJson?.leaderboard) ? lbJson.leaderboard : [],
    );
    let marketplaceItems = Array.isArray(marketJson?.items) ? marketJson.items : [];
    let featuredPicks = Array.isArray(featuredJson) ? featuredJson : [];
    let freeTips = parseFreeTipItems(freeTipJson);
    const todayMatches = parseHeadlineMatchesPayload(headlineJson);

    if (footballOnly) {
      const sportOf = (item: unknown): string | undefined =>
        item && typeof item === 'object' ? (item as { sport?: string }).sport : undefined;
      marketplaceItems = marketplaceItems.filter((item: unknown) =>
        isDiscoverySportAllowed(sportOf(item)),
      );
      featuredPicks = featuredPicks.filter((item: unknown) =>
        isDiscoverySportAllowed(sportOf(item)),
      );
      freeTips = freeTips.filter((item) => isDiscoverySportAllowed(item.sport as string | undefined));
    }

    return {
      stats: parseStats(statsJson),
      leadingRoi: leadingRoiFromLeaderboard(lbJson),
      topTipsters,
      marketplaceItems,
      featuredPicks,
      freeTips,
      todayMatches,
    };
  } catch {
    return empty;
  }
}
