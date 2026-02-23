import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site-config';

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
  { path: '/tools/converter',   changeFrequency: 'weekly',  priority: 0.5 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL;
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

  return [...localised, ...enOnly];
}
