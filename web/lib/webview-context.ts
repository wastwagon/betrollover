/**
 * Heuristics for embedded browsers where Google Identity Services (GIS)
 * often fails to render or is blocked — e.g. Android WebView, WebViewGold, in-app browsers.
 */
export function isLikelyEmbeddedWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/; wv\)/i.test(ua)) return true;
  if (/WebViewGold/i.test(ua)) return true;
  if (/FBAN|FBAV|Instagram|Line\/|LinkedInApp|Snapchat/i.test(ua)) return true;
  return false;
}

/** Phones / tablets — wrapper apps (WebViewGold, etc.) almost always identify as mobile. */
export function isLikelyMobileClient(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile\/|Tablet/i.test(
    navigator.userAgent || '',
  );
}

/** PWA / “Add to Home Screen” — behaves like an embedded context for OAuth. */
export function isStandaloneDisplayMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
  } catch {
    /* ignore */
  }
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return !!nav.standalone;
}

/**
 * Prefer full-page OAuth (`/api/auth/google/start`) instead of GIS `renderButton`.
 * GIS works in desktop Safari/Chrome but commonly renders nothing in WebViewGold / in-app browsers.
 *
 * Opt-out for mobile Safari/Chrome widget: set `NEXT_PUBLIC_GOOGLE_USE_GIS_ON_MOBILE=1`
 * (embedded WebViews still use redirect). Force everything: `NEXT_PUBLIC_GOOGLE_WEBVIEW_USE_REDIRECT=1`.
 */
export function shouldPreferGoogleOAuthRedirect(): boolean {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_GOOGLE_WEBVIEW_USE_REDIRECT === '1') {
    return true;
  }
  if (isLikelyEmbeddedWebView()) return true;
  if (isStandaloneDisplayMode()) return true;
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_GOOGLE_USE_GIS_ON_MOBILE === '1') {
    return false;
  }
  return isLikelyMobileClient();
}
