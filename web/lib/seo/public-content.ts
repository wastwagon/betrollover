import type { SupportedLanguage } from '@/lib/i18n';
import { SITE_URL, getAvatarUrl } from '@/lib/site-config';
import { getServerBackendOrigin } from '@/lib/seo/server-backend';

const API = () => `${getServerBackendOrigin()}/api/v1`;

export type NewsArticlePublic = {
  id?: number;
  slug: string;
  title: string;
  excerpt: string | null;
  content?: string | null;
  category?: string;
  sport?: string;
  imageUrl: string | null;
  sourceUrl?: string | null;
  publishedAt: string | null;
  language?: string;
};

export function truncateMetaDescription(text: string, max = 158): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

export function newsOgImageUrl(imageUrl: string | null | undefined): string {
  if (imageUrl?.startsWith('http')) return imageUrl;
  if (imageUrl) return `${SITE_URL}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
  return `${SITE_URL}/og-image.png`;
}

export async function fetchNewsArticleBySlug(
  slug: string,
  language: SupportedLanguage,
): Promise<NewsArticlePublic | null> {
  if (!slug) return null;
  try {
    const res = await fetch(`${API()}/news/${encodeURIComponent(slug)}?language=${language}`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return null;
    return (await res.json()) as NewsArticlePublic;
  } catch {
    return null;
  }
}

export async function fetchRelatedNewsArticles(
  language: SupportedLanguage,
  slug: string,
  sport?: string | null,
): Promise<NewsArticlePublic[]> {
  const qs = new URLSearchParams({ limit: '6', language });
  if (sport) qs.set('sport', sport);
  try {
    const res = await fetch(`${API()}/news?${qs}`, { next: { revalidate: 120 } });
    if (!res.ok) return [];
    const batch = (await res.json()) as NewsArticlePublic[];
    if (!Array.isArray(batch)) return [];
    return batch.filter((a) => a?.slug && a.slug !== slug).slice(0, 4);
  } catch {
    return [];
  }
}

/** Paginate published news for sitemap (one language at a time). */
export async function fetchAllNewsArticlesForSitemap(
  language: SupportedLanguage,
  pageSize = 200,
): Promise<Pick<NewsArticlePublic, 'slug' | 'publishedAt'>[]> {
  const out: Pick<NewsArticlePublic, 'slug' | 'publishedAt'>[] = [];
  let offset = 0;
  const maxPages = 250;

  for (let page = 0; page < maxPages; page++) {
    try {
      const res = await fetch(
        `${API()}/news?language=${language}&limit=${pageSize}&offset=${offset}`,
        { next: { revalidate: 3600 } },
      );
      if (!res.ok) break;
      const batch = (await res.json()) as NewsArticlePublic[];
      if (!Array.isArray(batch) || batch.length === 0) break;
      for (const a of batch) {
        if (a?.slug) out.push({ slug: a.slug, publishedAt: a.publishedAt ?? null });
      }
      if (batch.length < pageSize) break;
      offset += pageSize;
    } catch {
      break;
    }
  }

  return out;
}

export type TipsterProfileSeo = {
  tipster: {
    username: string;
    display_name: string;
    bio: string | null;
    avatar_url: string | null;
    win_rate: number;
    roi: number;
    total_predictions: number;
  };
};

export async function fetchTipsterProfileForSeo(username: string): Promise<TipsterProfileSeo | null> {
  if (!username) return null;
  try {
    const res = await fetch(`${API()}/tipsters/${encodeURIComponent(username)}`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return null;
    return (await res.json()) as TipsterProfileSeo;
  } catch {
    return null;
  }
}

export async function fetchTipsterUsernamesForSitemap(): Promise<string[]> {
  try {
    const res = await fetch(`${API()}/tipsters/sitemap/usernames`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { usernames?: string[] };
    return Array.isArray(data.usernames) ? data.usernames : [];
  } catch {
    return [];
  }
}

export function tipsterOgImageUrl(avatarPath: string | null | undefined): string {
  const resolved = getAvatarUrl(avatarPath ?? null, 512);
  if (!resolved) return `${SITE_URL}/og-image.png`;
  if (resolved.startsWith('http')) return resolved;
  const base = SITE_URL.replace(/\/$/, '');
  return `${base}${resolved.startsWith('/') ? resolved : `/${resolved}`}`;
}

export type ResourceItemPublic = {
  slug: string;
  title: string;
  excerpt: string | null;
  language?: string;
  category?: { slug: string; name: string };
  publishedAt?: string | null;
};

export async function fetchResourceItemForSeo(
  categorySlug: string,
  itemSlug: string,
  language: SupportedLanguage,
): Promise<ResourceItemPublic | null> {
  if (!categorySlug || !itemSlug) return null;
  try {
    const res = await fetch(
      `${API()}/resources/categories/${encodeURIComponent(categorySlug)}/items/${encodeURIComponent(itemSlug)}?language=${language}`,
      { next: { revalidate: 120 } },
    );
    if (!res.ok) return null;
    return (await res.json()) as ResourceItemPublic;
  } catch {
    return null;
  }
}

type ResourceItemListRow = {
  slug: string;
  publishedAt?: string | null;
  category?: { slug: string } | null;
};

/** Paginated published resource guides for sitemap. */
export async function fetchAllResourceItemsForSitemap(
  language: SupportedLanguage,
  pageSize = 200,
): Promise<Array<{ categorySlug: string; itemSlug: string; publishedAt: string | null }>> {
  const out: Array<{ categorySlug: string; itemSlug: string; publishedAt: string | null }> = [];
  let offset = 0;
  for (let p = 0; p < 250; p++) {
    try {
      const res = await fetch(
        `${API()}/resources/items?language=${language}&limit=${pageSize}&offset=${offset}`,
        { next: { revalidate: 3600 } },
      );
      if (!res.ok) break;
      const batch = (await res.json()) as ResourceItemListRow[];
      if (!Array.isArray(batch) || batch.length === 0) break;
      for (const row of batch) {
        const cat = row.category?.slug;
        if (!row.slug || !cat) continue;
        out.push({
          categorySlug: cat,
          itemSlug: row.slug,
          publishedAt: row.publishedAt != null ? String(row.publishedAt) : null,
        });
      }
      if (batch.length < pageSize) break;
      offset += pageSize;
    } catch {
      break;
    }
  }
  return out;
}

/** Public marketplace coupon fields used for `/coupons/[id]` metadata (free pending + settled). */
export type PublicCouponMeta = {
  id: number;
  title?: string | null;
  totalOdds?: number | string | null;
  price?: number | string | null;
  result?: string | null;
  tipster?: {
    displayName?: string | null;
    username?: string | null;
  } | null;
};

export async function fetchPublicCouponMeta(
  id: number,
  options?: { revalidate?: number },
): Promise<PublicCouponMeta | null> {
  if (!Number.isFinite(id) || id < 1) return null;
  try {
    const res = await fetch(`${API()}/accumulators/${id}/public`, {
      next: { revalidate: options?.revalidate ?? 120 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as PublicCouponMeta;
    return data?.id ? data : null;
  } catch {
    return null;
  }
}

export function couponMetaTitle(coupon: PublicCouponMeta): string {
  const tipster =
    coupon.tipster?.displayName?.trim() ||
    coupon.tipster?.username?.trim() ||
    'Tipster';
  const title = (coupon.title || '').trim() || 'Football pick';
  return `${title} — ${tipster}`;
}

export function couponMetaDescription(coupon: PublicCouponMeta): string {
  const tipster =
    coupon.tipster?.displayName?.trim() ||
    coupon.tipster?.username?.trim() ||
    'a verified tipster';
  const oddsRaw = coupon.totalOdds != null ? Number(coupon.totalOdds) : NaN;
  const odds = Number.isFinite(oddsRaw) ? oddsRaw.toFixed(2) : null;
  const priceRaw = coupon.price != null ? Number(coupon.price) : NaN;
  const priceLabel = Number.isFinite(priceRaw) && priceRaw > 0 ? 'Premium pick' : 'Free pick';
  const result = (coupon.result || 'pending').toLowerCase();
  const resultLabel =
    result === 'won' ? 'Won' : result === 'lost' ? 'Lost' : result === 'void' ? 'Void' : 'Pending';
  const oddsPart = odds ? ` Combined odds ${odds}.` : '';
  return truncateMetaDescription(
    `${priceLabel} by ${tipster} on BetRollover.${oddsPart} Result: ${resultLabel}. Escrow-protected marketplace — 18+.`,
  );
}

function numericId(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function readPagedItems(data: unknown, offset: number, pageSize: number): { items: Record<string, unknown>[]; hasMore: boolean } {
  if (Array.isArray(data)) {
    return { items: data as Record<string, unknown>[], hasMore: data.length >= pageSize };
  }
  if (!data || typeof data !== 'object') return { items: [], hasMore: false };
  const obj = data as Record<string, unknown>;
  const items = Array.isArray(obj.items) ? (obj.items as Record<string, unknown>[]) : [];
  const total = typeof obj.total === 'number' ? obj.total : typeof obj.total_count === 'number' ? obj.total_count : null;
  let hasMore = items.length >= pageSize;
  if ('hasMore' in obj || 'has_more' in obj) {
    hasMore = obj.hasMore === true || obj.has_more === true;
  } else if (total != null) {
    hasMore = offset + items.length < total;
  }
  return { items, hasMore };
}

/** Settled archive + active marketplace coupon IDs for sitemap (fails soft). */
export async function fetchCouponIdsForSitemap(max = 4000): Promise<Array<{ id: number; lastModified: string | null }>> {
  const byId = new Map<number, string | null>();

  const pull = async (path: string, pageSize: number) => {
    for (let offset = 0; offset < max && byId.size < max; offset += pageSize) {
      try {
        const res = await fetch(`${API()}${path}&limit=${pageSize}&offset=${offset}`, {
          next: { revalidate: 3600 },
        });
        if (!res.ok) break;
        const { items, hasMore } = readPagedItems(await res.json(), offset, pageSize);
        if (items.length === 0) break;
        for (const row of items) {
          const id = numericId(row.id);
          if (!id || byId.has(id)) continue;
          const updated =
            (typeof row.updatedAt === 'string' && row.updatedAt) ||
            (typeof row.createdAt === 'string' && row.createdAt) ||
            null;
          byId.set(id, updated);
        }
        if (!hasMore || items.length < pageSize) break;
      } catch {
        break;
      }
    }
  };

  await pull('/accumulators/archive?', 200);
  await pull('/accumulators/marketplace/public?', 100);
  return [...byId.entries()].map(([id, lastModified]) => ({ id, lastModified }));
}

/** Live, upcoming, and recent platform fixtures for sitemap. */
export async function fetchMatchIdsForSitemap(): Promise<Array<{ id: number; lastModified: string | null }>> {
  const byId = new Map<number, string | null>();
  const ingest = (rows: unknown) => {
    if (!Array.isArray(rows)) return;
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const obj = row as Record<string, unknown>;
      const id = numericId(obj.id);
      if (!id) continue;
      const updated =
        (typeof obj.syncedAt === 'string' && obj.syncedAt) ||
        (typeof obj.matchDate === 'string' && obj.matchDate) ||
        null;
      if (!byId.has(id)) byId.set(id, updated);
    }
  };

  try {
    const res = await fetch(`${API()}/fixtures/platform/live-scores?archiveHours=168`, {
      next: { revalidate: 900 },
    });
    if (res.ok) {
      const payload = (await res.json()) as Record<string, unknown>;
      ingest(payload.live);
      ingest(payload.upcoming);
      ingest(payload.recent);
    }
  } catch {
    /* backend unavailable */
  }

  return [...byId.entries()].map(([id, lastModified]) => ({ id, lastModified }));
}
