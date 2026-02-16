/**
 * Site configuration for SEO, canonical URLs, and Open Graph.
 * Uses NEXT_PUBLIC_APP_URL in production; falls back to localhost for dev.
 * Optimized for global reach with Africa focus (Ghana, Nigeria, Kenya, South Africa).
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:6002';

/** API base URL: use proxy in browser (works in Docker), direct URL on server */
export const getApiUrl = () =>
  typeof window !== 'undefined'
    ? '/api/backend'
    : (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001');

export const SITE_NAME = 'BetRollover';
export const SITE_DESCRIPTION =
  'Risk-free football betting tips with escrow protection. Win or get your money back. Africa\'s premier tipster marketplace—Ghana, Nigeria, Kenya & beyond.';

/** Africa-focused + global SEO keywords for discoverability */
export const SITE_KEYWORDS = [
  'football tips',
  'betting tips',
  'tipster marketplace',
  'escrow betting',
  'risk-free tips',
  'Ghana betting tips',
  'Nigeria betting tips',
  'Kenya football tips',
  'South Africa tipsters',
  'Africa betting',
  'verified tipsters',
  'football predictions',
  'accumulator tips',
  'sports betting tips',
];

/** Africa locales for hreflang—signals relevance to search engines in these regions */
export const AFRICA_LOCALE_CODES = ['en-GH', 'en-NG', 'en-ZA', 'en-KE', 'en', 'x-default'] as const;

/** Build hreflang alternates for a given path (e.g. '' for home, '/marketplace' for marketplace) */
export function getAfricaAlternates(path = ''): Record<string, string> {
  const base = path ? `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}` : SITE_URL;
  return Object.fromEntries(AFRICA_LOCALE_CODES.map((code) => [code, base]));
}
