/** Light success feedback on supported mobile browsers / PWA (ignored elsewhere). */
export function hapticSuccess(): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate(12);
  } catch {
    /* noop */
  }
}
