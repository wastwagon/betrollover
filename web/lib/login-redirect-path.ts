/**
 * Login URL safe for SSR and the first client paint (no `window`).
 * Use for `href` on links rendered during React SSR — avoids hydration #418.
 */
export function loginRedirectUrl(returnPath = '/marketplace'): string {
  const path = returnPath.startsWith('/') ? returnPath : `/${returnPath}`;
  return `/login?redirect=${encodeURIComponent(path)}`;
}

/** Extract return path from a `loginRedirectUrl` / `loginRedirectPath` href. */
export function loginRedirectReturnPath(loginHref: string, fallback = '/marketplace'): string {
  try {
    const q = loginHref.indexOf('?');
    if (q === -1) return fallback;
    const redirect = new URLSearchParams(loginHref.slice(q + 1)).get('redirect');
    return redirect && redirect.startsWith('/') ? redirect : fallback;
  } catch {
    return fallback;
  }
}

/** Current path + query for post-login redirect. Use in click handlers after mount, not in SSR `href`. */
export function currentLoginRedirectPath(fallback = '/marketplace'): string {
  if (typeof window === 'undefined') return loginRedirectUrl(fallback);
  return `/login?redirect=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`;
}
