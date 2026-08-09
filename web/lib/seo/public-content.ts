import type { SupportedLanguage } from '@/lib/i18n';
import { SITE_URL, getAvatarUrl } from '@/lib/site-config';
import { getServerBackendOrigin } from '@/lib/seo/server-backend';

const API = () => `${getServerBackendOrigin()}/api/v1`;

export type NewsArticlePublic = {
  slug: string;
  title: string;
  excerpt: string | null;
  imageUrl: string | null;
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
