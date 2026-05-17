/** Current path + query for post-login redirect (client only). */
export function currentLoginRedirectPath(fallback = '/marketplace'): string {
  if (typeof window === 'undefined') return fallback;
  return `/login?redirect=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`;
}
