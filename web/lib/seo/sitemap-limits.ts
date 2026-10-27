/** Focus crawl budget on hubs + recent English deep links (hreflang covers /fr on-page). */

export const SITEMAP_COUPON_MAX = 200;
export const SITEMAP_MATCH_MAX = 48;
/** Injury/news volume was inflating “Discovered – not indexed” (~18k URLs). */
export const SITEMAP_NEWS_MAX_PER_LANGUAGE = 150;

export function sortNewsByPublished<T extends { publishedAt: string | null }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  });
}
