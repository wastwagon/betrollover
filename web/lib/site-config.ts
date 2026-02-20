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
export const SITE_DESCRIPTION =
  'Risk-free football tips from verified tipsters. Track win rate, ROI & streak. Escrow—win or refund. Africa\'s tipster marketplace for Ghana, Nigeria, Kenya.';

/** Africa-focused + global SEO keywords for discoverability */
export const SITE_KEYWORDS = [
  'football tips',
  'betting tips',
  'tipster marketplace',
  'win rate',
  'ROI',
  'verified tipsters',
  'escrow betting',
  'risk-free tips',
  'Ghana betting tips',
  'Nigeria betting tips',
  'Kenya football tips',
  'South Africa tipsters',
  'Africa betting',
  'football predictions',
  'accumulator tips',
  'sports betting tips',
  'tipster rank',
  'tipster streak',
];

/** Africa locales for hreflang—signals relevance to search engines in these regions */
export const AFRICA_LOCALE_CODES = ['en-GH', 'en-NG', 'en-ZA', 'en-KE', 'en', 'x-default'] as const;

/** Build avatar URL with optional resize (reduces 25MB+ AI tipster avatars to ~5KB) */
export function getAvatarUrl(avatarPath: string | null | undefined, size = 96): string | null {
  if (!avatarPath) return null;
  if (avatarPath.startsWith('http')) return avatarPath;
  const path = avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`;
  if (path.startsWith('/avatars/') || path.startsWith('/uploads/avatars/')) {
    const base = getApiBaseUrl();
    if (base === '/api/backend') {
      return `/api/avatars/resize?path=${encodeURIComponent(path)}&size=${size}`;
    }
    return `${base}/avatars/resize?path=${encodeURIComponent(path)}&size=${size}`;
  }
  return `${getApiBaseUrl()}${path}`;
}

/** API origin for preconnect (performance: saves ~300ms LCP when API is external) */
export function getApiOriginForPreconnect(): string | null {
  const url = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '';
  if (!url || url.includes('localhost')) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/** Build hreflang alternates for a given path (e.g. '' for home, '/marketplace' for marketplace) */
export function getAfricaAlternates(path = ''): Record<string, string> {
  const base = path ? `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}` : SITE_URL;
  return Object.fromEntries(AFRICA_LOCALE_CODES.map((code) => [code, base]));
}
