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
