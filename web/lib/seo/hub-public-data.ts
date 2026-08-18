import { FOOTBALL_SPORT_KEY, isDiscoverySportAllowed, isFootballOnlyDiscovery } from '@/lib/football-only-discovery';
import { getServerBackendOrigin } from '@/lib/seo/server-backend';
import type { SupportedLanguage } from '@/lib/i18n';

const API = () => `${getServerBackendOrigin()}/api/v1`;

export function firstSearchParam(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  if (Array.isArray(v)) return v[0] || undefined;
  return v || undefined;
}

async function hubFetch(path: string, revalidate = 60): Promise<unknown> {
  try {
    const res = await fetch(`${API()}${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export type MarketplaceHubData = {
  items: Record<string, unknown>[];
  total: number;
  hasMore: boolean;
};

export async function fetchMarketplaceHub(options?: {
  sport?: string | null;
  tipster?: string | null;
  priceFilter?: string | null;
  revalidate?: number;
}): Promise<MarketplaceHubData> {
  const qs = new URLSearchParams({ limit: '24' });
  const footballOnly = isFootballOnlyDiscovery();
  const sport = footballOnly ? FOOTBALL_SPORT_KEY : options?.sport?.trim() || '';
  if (sport) qs.set('sport', sport);
  if (options?.tipster?.trim()) qs.set('tipsterSearch', options.tipster.trim());
  if (options?.priceFilter && options.priceFilter !== 'all') qs.set('priceFilter', options.priceFilter);

  const data = await hubFetch(`/accumulators/marketplace/public?${qs}`, options?.revalidate ?? 30);
  const obj = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  let items = Array.isArray(obj.items) ? (obj.items as Record<string, unknown>[]) : Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  if (footballOnly) {
    items = items.filter((item) => isDiscoverySportAllowed(typeof item.sport === 'string' ? item.sport : undefined));
  }
  return {
    items,
    total: typeof obj.total === 'number' ? obj.total : items.length,
    hasMore: Boolean(obj.hasMore),
  };
}

export async function fetchLeaderboardHub(options?: {
  period?: string;
  sport?: string;
  limit?: number;
  revalidate?: number;
}): Promise<Record<string, unknown>[]> {
  const qs = new URLSearchParams({ limit: String(options?.limit ?? 50) });
  if (options?.period && options.period !== 'all_time') qs.set('period', options.period);
  if (options?.sport && options.sport !== 'all') qs.set('sport', options.sport);
  const data = await hubFetch(`/leaderboard?${qs}`, options?.revalidate ?? 120);
  const obj = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  if (Array.isArray(obj.leaderboard)) return obj.leaderboard as Record<string, unknown>[];
  if (Array.isArray(obj.tipsters)) return obj.tipsters as Record<string, unknown>[];
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

export async function fetchTipstersHub(options?: {
  sortBy?: string;
  sport?: string;
  search?: string;
  revalidate?: number;
}): Promise<Record<string, unknown>[]> {
  const qs = new URLSearchParams({
    limit: '50',
    sort_by: options?.sortBy || 'roi',
    order: 'desc',
  });
  if (options?.sport && options.sport !== 'all') qs.set('sport', options.sport);
  if (options?.search?.trim()) qs.set('search', options.search.trim());
  const data = await hubFetch(`/tipsters?${qs}`, options?.revalidate ?? 120);
  const obj = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  if (Array.isArray(obj.tipsters)) return obj.tipsters as Record<string, unknown>[];
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

export async function fetchNewsHub(options?: {
  language?: SupportedLanguage;
  category?: string;
  sport?: string;
  revalidate?: number;
}): Promise<Record<string, unknown>[]> {
  const qs = new URLSearchParams({
    limit: '50',
    language: options?.language || 'en',
  });
  if (options?.category && options.category !== 'all') qs.set('category', options.category);
  if (options?.sport) qs.set('sport', options.sport);
  const data = await hubFetch(`/news?${qs}`, options?.revalidate ?? 120);
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

export type LiveScoresHubPayload = {
  live: Record<string, unknown>[];
  upcoming: Record<string, unknown>[];
  recent: Record<string, unknown>[];
  generatedAt?: string;
};

export async function fetchLiveScoresHub(revalidate = 15): Promise<LiveScoresHubPayload | null> {
  const data = await hubFetch('/fixtures/platform/live-scores?archiveHours=48', revalidate);
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  return {
    live: Array.isArray(obj.live) ? (obj.live as Record<string, unknown>[]) : [],
    upcoming: Array.isArray(obj.upcoming) ? (obj.upcoming as Record<string, unknown>[]) : [],
    recent: Array.isArray(obj.recent) ? (obj.recent as Record<string, unknown>[]) : [],
    generatedAt: typeof obj.generatedAt === 'string' ? obj.generatedAt : new Date().toISOString(),
  };
}

export async function fetchArchiveHub(revalidate = 120): Promise<Record<string, unknown>[]> {
  const data = await hubFetch('/accumulators/archive?limit=100', revalidate);
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: Record<string, unknown>[] }).items;
  }
  return [];
}
