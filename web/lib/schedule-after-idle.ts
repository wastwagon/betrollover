/** Run work after first paint / idle — keeps PSI TBT lower on home below-the-fold refetches. */
export function scheduleAfterIdle(fn: () => void, timeoutMs = 2000): () => void {
  if (typeof window === 'undefined') return () => {};
  const win = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (typeof win.requestIdleCallback === 'function') {
    const id = win.requestIdleCallback(fn, { timeout: timeoutMs });
    return () => win.cancelIdleCallback?.(id);
  }
  const t = window.setTimeout(fn, 80);
  return () => window.clearTimeout(t);
}
