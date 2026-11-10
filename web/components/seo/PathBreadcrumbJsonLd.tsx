import { headers } from 'next/headers';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';
import { localizedUrl, type UrlLocale } from '@/lib/site-config';
import { getLocale } from '@/lib/i18n';

const LABEL: Record<string, string> = {
  about: 'About',
  'acca-generator': 'Acca generator',
  'btts-predictions': 'Both teams to score predictions',
  'buy-football-tips': 'Buy football tips',
  contact: 'Contact',
  coupons: 'Picks',
  archive: 'Settled archive',
  'football-predictions-today': 'Football predictions today',
  'football-tips-ghana': 'Football tips Ghana',
  'ghana-premier-league-predictions': 'Ghana Premier League predictions',
  guides: 'Guides',
  'how-it-works': 'How it works',
  leaderboard: 'Leaderboard',
  learn: 'Learn',
  'league-tables': 'League tables',
  'live-scores': 'Live scores',
  marketplace: 'Marketplace',
  matches: 'Matches',
  news: 'News',
  'over-2-5-goals-predictions': 'Over 2.5 goals predictions',
  resources: 'Resources',
  rollover: 'Rollover',
  subscriptions: 'Subscriptions',
  support: 'Support',
  tipsters: 'Tipsters',
  'track-record': 'Track record',
  'responsible-gambling': 'Responsible use',
  terms: 'Terms',
  privacy: 'Privacy',
};

const SKIP_PREFIXES = [
  '/admin',
  '/dashboard',
  '/wallet',
  '/profile',
  '/my-picks',
  '/my-purchases',
  '/notifications',
  '/create-pick',
  '/earnings',
  '/login',
  '/register',
  '/forgot-password',
  '/verify-email',
  '/api-proxy',
];

function titleCase(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * SSR BreadcrumbList for public inner pages from middleware `x-pathname`.
 * Home is omitted (no breadcrumb). Pages that already emit custom crumbs still get
 * this generic trail — duplicate BreadcrumbList is acceptable; prefer specific ones
 * closer to the content when both exist.
 */
export async function PathBreadcrumbJsonLd() {
  const h = await headers();
  const rawPath = h.get('x-pathname') || '/';
  let path = rawPath.split('?')[0] || '/';
  if (path.startsWith('/fr/') || path === '/fr') {
    path = path === '/fr' ? '/' : path.slice(3) || '/';
  }
  if (path === '/' || path === '') return null;
  if (SKIP_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return null;

  const locale = (await getLocale()) as UrlLocale;
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const items: Array<{ name: string; url: string }> = [
    { name: 'Home', url: localizedUrl('/', locale) },
  ];

  let acc = '';
  for (const seg of segments) {
    acc += `/${seg}`;
    const name = LABEL[seg] || ( /^\d+$/.test(seg) ? `#${seg}` : titleCase(seg));
    items.push({ name, url: localizedUrl(acc, locale) });
  }

  if (items.length < 2) return null;
  return <BreadcrumbJsonLd items={items} />;
}
