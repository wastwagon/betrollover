/**
 * Tactile feedback for mobile web + WebViewGold apps.
 * WebViewGold handles successhaptic:// / lighthaptic:// / errorhaptic://
 * (no native project changes required). Falls back to navigator.vibrate on browsers.
 */

type HapticKind = 'light' | 'success' | 'error';

function isWebViewGold(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /WebViewGold/i.test(ua) || (/Android/i.test(ua) && /; wv\)/i.test(ua));
}

function fireUrlScheme(kind: HapticKind): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const scheme =
    kind === 'success' ? 'successhaptic://' : kind === 'error' ? 'errorhaptic://' : 'lighthaptic://';
  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = scheme;
    document.body.appendChild(iframe);
    window.setTimeout(() => {
      iframe.remove();
    }, 100);
  } catch {
    /* noop */
  }
}

function vibrateMs(ms: number): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate(ms);
  } catch {
    /* noop */
  }
}

function haptic(kind: HapticKind, vibrateFallback: number): void {
  if (typeof window === 'undefined') return;
  if (isWebViewGold()) {
    fireUrlScheme(kind);
    return;
  }
  vibrateMs(vibrateFallback);
}

/** Light success feedback (likes, copy, follow). */
export function hapticSuccess(): void {
  haptic('success', 12);
}

/** Soft selection / tab change. */
export function hapticLight(): void {
  haptic('light', 8);
}

/** Error / destructive confirmation. */
export function hapticError(): void {
  haptic('error', 24);
}
