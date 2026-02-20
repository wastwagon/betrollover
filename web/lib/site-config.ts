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
  'Risk-free football tips from verified tipsters. Track win rate, ROI, and rank. Escrow protection—win or get your money back. Africa\'s premier tipster marketplace for Ghana, Nigeria, Kenya & beyond.';

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
