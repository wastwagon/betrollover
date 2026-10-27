import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site-config';

/**
 * Explicit allow-list for indexable hubs (Google uses longest match vs disallow).
 * Cloudflare may prepend AI-bot blocks; these lines keep Search crawlers unambiguous.
 */
const PUBLIC_ALLOW = [
  '/',
  '/news/',
  '/league-tables',
  '/live-scores',
  '/matches/',
  '/tipsters/',
  '/marketplace',
  '/leaderboard',
  '/resources/',
  '/guides/',
  '/coupons/',
  '/buy-football-tips',
  '/how-it-works',
  '/learn',
  '/about',
  '/contact',
  '/rollover',
  '/acca-generator',
  '/coupons/archive',
];

const PRIVATE_PATHS = [
  '/admin/',
  '/fr/admin/',
  '/dashboard',
  '/fr/dashboard',
  '/dashboard/sell',
  '/fr/dashboard/sell',
  '/profile',
  '/fr/profile',
  '/wallet',
  '/fr/wallet',
  '/my-picks',
  '/fr/my-picks',
  '/my-purchases',
  '/fr/my-purchases',
  '/notifications',
  '/fr/notifications',
  '/create-pick',
  '/fr/create-pick',
  '/earnings',
  '/fr/earnings',
  '/forgot-password',
  '/fr/forgot-password',
  '/verify-email',
  '/fr/verify-email',
  '/api-proxy/',
];

export default function robots(): MetadataRoute.Robots {
  const crawlRule = {
    allow: PUBLIC_ALLOW,
    disallow: PRIVATE_PATHS,
  };

  return {
    rules: [
      { userAgent: 'Googlebot', ...crawlRule },
      { userAgent: 'Googlebot-Image', ...crawlRule },
      { userAgent: '*', ...crawlRule },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
