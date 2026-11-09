/**
 * WebViewGold Dynamic UI — change the native status bar from the website
 * (no app rebuild). Docs: statusbarcolor://R,G,B and statusbartextcolor://black|white
 */

function isLikelyWebViewGoldHost(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  // Injected by WebViewGold after load even when UA is a stock WebKit string.
  if (typeof (window as Window & { isDarkMode?: boolean }).isDarkMode === 'boolean') return true;
  const ua = navigator.userAgent || '';
  if (/WebViewGold|BetRolloverApp/i.test(ua)) return true;
  // Packaged Android webviews often omit "WebViewGold" from UA but still honor the schemes.
  if (/Android/i.test(ua) && /; wv\)/i.test(ua)) return true;
  return false;
}

function fireWebViewGoldScheme(scheme: string): void {
  if (typeof document === 'undefined') return;
  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = scheme;
    document.body.appendChild(iframe);
    window.setTimeout(() => iframe.remove(), 100);
  } catch {
    /* noop */
  }
}

function prefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // WebViewGold may inject isDarkMode after load
    const injected = (window as Window & { isDarkMode?: boolean }).isDarkMode;
    if (typeof injected === 'boolean') return injected;
  } catch {
    /* ignore */
  }
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

/** Match the white (or dark) header chrome under the clock / network icons. */
export function syncWebViewGoldStatusBar(): void {
  if (typeof window === 'undefined' || !isLikelyWebViewGoldHost()) return;

  if (prefersDark()) {
    // --card dark: #1c1c1e
    fireWebViewGoldScheme('statusbarcolor://28,28,30');
    fireWebViewGoldScheme('statusbartextcolor://white');
    return;
  }

  fireWebViewGoldScheme('statusbarcolor://255,255,255');
  fireWebViewGoldScheme('statusbartextcolor://black');
}
