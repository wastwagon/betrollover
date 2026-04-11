import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site-config';
import {
  fetchAllNewsArticlesForSitemap,
  fetchAllResourceItemsForSitemap,
  fetchTipsterUsernamesForSitemap,
} from '@/lib/seo/public-content';

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
  { path: '/discover',               changeFrequency: 'daily',   priority: 0.85 },
  { path: '/news',                   changeFrequency: 'daily',   priority: 0.8  },
  { path: '/resources',              changeFrequency: 'weekly',  priority: 0.7  },
  { path: '/community',              changeFrequency: 'daily',   priority: 0.7  },
  { path: '/coupons/archive',        changeFrequency: 'daily',   priority: 0.7  },
  { path: '/about',                  changeFrequency: 'monthly', priority: 0.6  },
  { path: '/how-it-works',           changeFrequency: 'monthly', priority: 0.6  },
  { path: '/learn',                  changeFrequency: 'monthly', priority: 0.7  },
  { path: '/contact',                changeFrequency: 'monthly', priority: 0.6  },
  { path: '/support',                changeFrequency: 'weekly',  priority: 0.5  },
  { path: '/invite',                 changeFrequency: 'monthly', priority: 0.5  },
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
  { path: '/login',             changeFrequency: 'monthly', priority: 0.5 },
  { path: '/register',          changeFrequency: 'monthly', priority: 0.5 },
  { path: '/earnings',          changeFrequency: 'weekly',  priority: 0.6 },
  { path: '/subscriptions',    changeFrequency: 'weekly',  priority: 0.5 },
  { path: '/tools/converter',   changeFrequency: 'weekly',  priority: 0.5 },
];

/** News + tipster profile URLs (requires API at build/runtime; fails soft if unreachable). */
async function dynamicSitemapEntries(origin: string): Promise<MetadataRoute.Sitemap> {
  const out: MetadataRoute.Sitemap = [];
  try {
    const [enNews, frNews, enResources, frResources, usernames] = await Promise.all([
      fetchAllNewsArticlesForSitemap('en'),
      fetchAllNewsArticlesForSitemap('fr'),
      fetchAllResourceItemsForSitemap('en'),
      fetchAllResourceItemsForSitemap('fr'),
      fetchTipsterUsernamesForSitemap(),
    ]);

    const seenEn = new Set<string>();
    for (const a of enNews) {
      if (!a.slug || seenEn.has(a.slug)) continue;
      seenEn.add(a.slug);
      out.push({
        url: `${origin}/news/${encodeURIComponent(a.slug)}`,
        lastModified: a.publishedAt ? new Date(a.publishedAt) : new Date(),
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
        lastModified: a.publishedAt ? new Date(a.publishedAt) : new Date(),
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
        lastModified: r.publishedAt ? new Date(r.publishedAt) : new Date(),
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
        lastModified: r.publishedAt ? new Date(r.publishedAt) : new Date(),
        changeFrequency: 'monthly',
        priority: 0.5,
      });
    }

    for (const u of usernames) {
      if (!u) continue;
      const seg = encodeURIComponent(u);
      out.push({
        url: `${origin}/tipsters/${seg}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.75,
      });
      out.push({
        url: `${origin}/fr/tipsters/${seg}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.7,
      });
    }
  } catch {
    /* backend unavailable during build — static hub URLs still valid */
  }
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL.replace(/\/$/, '');
  const now = new Date();

  const localised: MetadataRoute.Sitemap = LOCALISED_PAGES.flatMap(({ path, changeFrequency, priority }) => {
    const enUrl  = path === '/' ? base : `${base}${path}`;
    const frUrl  = `${base}/fr${path === '/' ? '' : path}`;
    return [
      { url: enUrl, lastModified: now, changeFrequency, priority },
      // French version gets a slightly lower priority so the English canonical is preferred
      { url: frUrl, lastModified: now, changeFrequency, priority: Math.max(priority - 0.05, 0.1) },
    ];
  });

  const enOnly: MetadataRoute.Sitemap = EN_ONLY_PAGES.map(({ path, changeFrequency, priority }) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const dynamic = await dynamicSitemapEntries(base);

  return [...localised, ...enOnly, ...dynamic];
}
