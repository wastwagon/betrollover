import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site-config';
import {
  fetchAllNewsArticlesForSitemap,
  fetchAllResourceItemsForSitemap,
  fetchCouponIdsForSitemap,
  fetchMatchIdsForSitemap,
  fetchTipsterUsernamesForSitemap,
} from '@/lib/seo/public-content';
import { isSubscriptionsEnabled } from '@/lib/subscriptions-enabled';

/**
 * Core pages that exist in both English (canonical) and French (/fr/...) versions.
 * High-priority SEO pages are listed first.
 */
const LOCALISED_PAGES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}> = [
  { path: '/',                       changeFrequency: 'weekly',  priority: 1.0  },
  { path: '/marketplace',            changeFrequency: 'daily',   priority: 0.9  },
  { path: '/tipsters',               changeFrequency: 'daily',   priority: 0.9  },
  { path: '/leaderboard',            changeFrequency: 'daily',   priority: 0.8  },
  { path: '/acca-generator',         changeFrequency: 'weekly',  priority: 0.85 },
  { path: '/rollover',               changeFrequency: 'daily',   priority: 0.8  },
  { path: '/live-scores',            changeFrequency: 'hourly',  priority: 0.8  },
  { path: '/league-tables',          changeFrequency: 'daily',   priority: 0.75 },
  { path: '/news',                   changeFrequency: 'daily',   priority: 0.8  },
  { path: '/resources',              changeFrequency: 'weekly',  priority: 0.7  },
  { path: '/guides',                 changeFrequency: 'weekly',  priority: 0.65 },
  { path: '/guides/escrow-refunds',  changeFrequency: 'monthly', priority: 0.6  },
  { path: '/guides/evaluate-tipsters', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/about',                  changeFrequency: 'monthly', priority: 0.6  },
  { path: '/how-it-works',           changeFrequency: 'monthly', priority: 0.6  },
  { path: '/learn',                  changeFrequency: 'monthly', priority: 0.7  },
  { path: '/contact',                changeFrequency: 'monthly', priority: 0.6  },
  { path: '/coupons/archive',        changeFrequency: 'daily',   priority: 0.7  },
  { path: '/terms',                  changeFrequency: 'monthly', priority: 0.4  },
  { path: '/privacy',                changeFrequency: 'monthly', priority: 0.4  },
  { path: '/responsible-gambling',   changeFrequency: 'monthly', priority: 0.4  },
];

/** English-only pages (auth flows, user dashboards — no French variant needed). */
const EN_ONLY_PAGES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}> = [
  ...(isSubscriptionsEnabled()
    ? [{ path: '/subscriptions', changeFrequency: 'weekly' as const, priority: 0.5 }]
    : []),
  { path: '/tools/converter',   changeFrequency: 'weekly',  priority: 0.5 },
];

/** News + tipster profile URLs (requires API at build/runtime; fails soft if unreachable). */
async function dynamicSitemapEntries(origin: string): Promise<MetadataRoute.Sitemap> {
  const out: MetadataRoute.Sitemap = [];
  try {
    const [enNews, frNews, enResources, frResources, usernames, coupons, matches] = await Promise.all([
      fetchAllNewsArticlesForSitemap('en'),
      fetchAllNewsArticlesForSitemap('fr'),
      fetchAllResourceItemsForSitemap('en'),
      fetchAllResourceItemsForSitemap('fr'),
      fetchTipsterUsernamesForSitemap(),
      fetchCouponIdsForSitemap(),
      fetchMatchIdsForSitemap(),
    ]);

    const seenEn = new Set<string>();
    for (const a of enNews) {
      if (!a.slug || seenEn.has(a.slug)) continue;
      seenEn.add(a.slug);
      out.push({
        url: `${origin}/news/${encodeURIComponent(a.slug)}`,
        lastModified: a.publishedAt ? new Date(a.publishedAt) : undefined,
        changeFrequency: 'weekly',
        priority: 0.65,
      });
    }

    const seenFr = new Set<string>();
    for (const a of frNews) {
      if (!a.slug || seenFr.has(a.slug)) continue;
      seenFr.add(a.slug);
      out.push({
        url: `${origin}/fr/news/${encodeURIComponent(a.slug)}`,
        lastModified: a.publishedAt ? new Date(a.publishedAt) : undefined,
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }

    const seenResEn = new Set<string>();
    for (const r of enResources) {
      const key = `${r.categorySlug}/${r.itemSlug}`;
      if (seenResEn.has(key)) continue;
      seenResEn.add(key);
      out.push({
        url: `${origin}/resources/${encodeURIComponent(r.categorySlug)}/${encodeURIComponent(r.itemSlug)}`,
        lastModified: r.publishedAt ? new Date(r.publishedAt) : undefined,
        changeFrequency: 'monthly',
        priority: 0.55,
      });
    }

    const seenResFr = new Set<string>();
    for (const r of frResources) {
      const key = `${r.categorySlug}/${r.itemSlug}`;
      if (seenResFr.has(key)) continue;
      seenResFr.add(key);
      out.push({
        url: `${origin}/fr/resources/${encodeURIComponent(r.categorySlug)}/${encodeURIComponent(r.itemSlug)}`,
        lastModified: r.publishedAt ? new Date(r.publishedAt) : undefined,
        changeFrequency: 'monthly',
        priority: 0.5,
      });
    }

    for (const u of usernames) {
      if (!u) continue;
      const seg = encodeURIComponent(u);
      out.push({
        url: `${origin}/tipsters/${seg}`,
        changeFrequency: 'daily',
        priority: 0.75,
      });
      out.push({
        url: `${origin}/fr/tipsters/${seg}`,
        changeFrequency: 'daily',
        priority: 0.7,
      });
    }

    for (const c of coupons) {
      const lastModified = c.lastModified ? new Date(c.lastModified) : undefined;
      out.push({
        url: `${origin}/coupons/${c.id}`,
        ...(lastModified && !Number.isNaN(lastModified.getTime()) ? { lastModified } : {}),
        changeFrequency: 'daily',
        priority: 0.65,
      });
      out.push({
        url: `${origin}/fr/coupons/${c.id}`,
        ...(lastModified && !Number.isNaN(lastModified.getTime()) ? { lastModified } : {}),
        changeFrequency: 'daily',
        priority: 0.6,
      });
    }

    for (const m of matches) {
      const lastModified = m.lastModified ? new Date(m.lastModified) : undefined;
      out.push({
        url: `${origin}/matches/${m.id}`,
        ...(lastModified && !Number.isNaN(lastModified.getTime()) ? { lastModified } : {}),
        changeFrequency: 'hourly',
        priority: 0.7,
      });
      out.push({
        url: `${origin}/fr/matches/${m.id}`,
        ...(lastModified && !Number.isNaN(lastModified.getTime()) ? { lastModified } : {}),
        changeFrequency: 'hourly',
        priority: 0.65,
      });
    }
  } catch {
    /* backend unavailable during build — static hub URLs still valid */
  }
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL.replace(/\/$/, '');

  const localised: MetadataRoute.Sitemap = LOCALISED_PAGES.flatMap(({ path, changeFrequency, priority }) => {
    const enUrl  = path === '/' ? base : `${base}${path}`;
    const frUrl  = `${base}/fr${path === '/' ? '' : path}`;
    return [
      { url: enUrl, changeFrequency, priority },
      { url: frUrl, changeFrequency, priority: Math.max(priority - 0.05, 0.1) },
    ];
  });

  const enOnly: MetadataRoute.Sitemap = EN_ONLY_PAGES.map(({ path, changeFrequency, priority }) => ({
    url: `${base}${path}`,
    changeFrequency,
    priority,
  }));

  const dynamic = await dynamicSitemapEntries(base);

  return [...localised, ...enOnly, ...dynamic];
}
