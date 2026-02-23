/**
 * Site configuration for SEO, canonical URLs, and Open Graph.
 * Uses NEXT_PUBLIC_APP_URL in production; falls back to localhost for dev.
 * Optimized for global reach with Africa focus (Ghana, Nigeria, Kenya, South Africa).
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:6002';

/** Base URL of the API (no path). Use for building upload/avatar URLs. */
export const getApiBaseUrl = (): string => {
  const base =
    typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_API_URL || '/api/backend')
      : (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001');
  return base.replace(/\/$/, '');
};

/** API base URL including /api/v1. Use for all API fetch calls. */
export const getApiUrl = (): string => {
  const baseClean = getApiBaseUrl();
  if (baseClean === '/api/backend') return baseClean;
  return `${baseClean}/api/v1`;
};

export const SITE_NAME = 'BetRollover';

/** Telegram for ads inquiries - companies interested in advertising */
export const TELEGRAM_ADS_HANDLE = process.env.NEXT_PUBLIC_TELEGRAM_ADS_HANDLE || 'betrollovertips';
export const TELEGRAM_ADS_URL = `https://t.me/${TELEGRAM_ADS_HANDLE}`;
export const SITE_DESCRIPTION =
  "Africa's multi-sport tipster marketplace. Verified tipsters across football, basketball, tennis, MMA & more. Track win rate, ROI & streak. Escrow-protected picks — purchase refunded if tips lose. Ghana, Nigeria, Kenya, South Africa.";

/** Africa-focused + global SEO keywords for discoverability */
export const SITE_KEYWORDS = [
  'tipster marketplace',
  'verified tipsters',
  'sports picks',
  'football tips',
  'basketball predictions',
  'tennis picks',
  'MMA predictions',
  'rugby tips',
  'sports predictions Africa',
  'football predictions Ghana',
  'Nigeria tipsters',
  'Kenya football tips',
  'South Africa sports picks',
  'win rate tipsters',
  'ROI sports tips',
  'accumulator picks',
  'escrow-protected picks',
  'risk-free sports tips',
  'free sports tips',
  'multi-sport coupons',
  'tipster rank',
  'tipster ROI',
  'tipster streak',
  'sports tips marketplace',
];

/** English Africa locale codes for hreflang */
export const AFRICA_LOCALE_CODES = ['en-GH', 'en-NG', 'en-ZA', 'en-KE', 'en', 'x-default'] as const;

/** French-speaking Africa locale codes for hreflang */
export const FRANCOPHONE_LOCALE_CODES = ['fr-CI', 'fr-SN', 'fr-CM', 'fr-ML', 'fr-BF', 'fr'] as const;

/** Build avatar URL.
 *  - /avatars/*.png  → served from Next.js public directory (no proxy needed)
 *  - /uploads/avatars/* → user-uploaded files stored on the backend, proxied via resize API
 *  - http/https → returned as-is
 */
export function getAvatarUrl(avatarPath: string | null | undefined, size = 96): string | null {
  if (!avatarPath) return null;
  if (avatarPath.startsWith('http')) return avatarPath;
  const path = avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`;
  // AI tipster avatars live in /public/avatars/ — serve directly, Next.js optimises via <Image>
  if (path.startsWith('/avatars/') && !path.startsWith('/avatars/resize')) {
    return path;
  }
  // User-uploaded avatars live on the backend — route through resize proxy
  if (path.startsWith('/uploads/avatars/')) {
    const base = getApiBaseUrl();
    if (base === '/api/backend') {
      return `/api/avatars/resize?path=${encodeURIComponent(path)}&size=${size}`;
    }
    return `${base}/avatars/resize?path=${encodeURIComponent(path)}&size=${size}`;
  }
  return `${getApiBaseUrl()}${path}`;
}

/** Build ad image URL. Relative paths (e.g. /uploads/ads/xxx.jpg) become full API URL. */
export function getAdImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  return `${getApiBaseUrl()}${path}`;
}

/** API origin for preconnect (performance: saves ~300ms LCP when API is external).
 * Uses NEXT_PUBLIC_API_URL only—browser must resolve this. BACKEND_URL (e.g. api:3001)
 * is for server-side Docker networking and is not browser-accessible. */
export function getApiOriginForPreconnect(): string | null {
  const url = process.env.NEXT_PUBLIC_API_URL || '';
  if (!url || url.includes('localhost')) return null;
  try {
    const parsed = new URL(url);
    // Exclude Docker/internal hostnames (e.g. "api") that the browser cannot resolve
    const hostname = parsed.hostname;
    if (!hostname || (!hostname.includes('.') && hostname !== 'localhost')) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

/**
 * Build hreflang alternates for a given path.
 *
 * Produces both English (canonical) and French (/fr/...) entries so Google
 * can serve the right language version to the right region.
 *
 * @example
 *   getAlternates('/marketplace')
 *   // → { 'en-GH': 'https://…/marketplace', 'fr-CI': 'https://…/fr/marketplace', … }
 */
export function getAlternates(path = ''): Record<string, string> {
  const normalPath = path ? (path.startsWith('/') ? path : `/${path}`) : '/';
  const enBase = normalPath === '/' ? SITE_URL : `${SITE_URL}${normalPath}`;
  const frBase = `${SITE_URL}/fr${normalPath === '/' ? '' : normalPath}`;

  const entries: Record<string, string> = {};

  // English (default + Africa-English locales)
  for (const code of AFRICA_LOCALE_CODES) {
    entries[code] = enBase;
  }

  // French (Francophone Africa locales)
  for (const code of FRANCOPHONE_LOCALE_CODES) {
    entries[code] = frBase;
  }

  return entries;
}

/** @deprecated Use getAlternates() which includes French URLs. */
export function getAfricaAlternates(path = ''): Record<string, string> {
  return getAlternates(path);
}
