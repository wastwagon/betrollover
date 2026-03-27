'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  const key = 'br_session_id';
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

function track(page: string) {
  const sessionId = getOrCreateSessionId();
  // Use same-origin proxy so we avoid CORS and can handle 404 from older API images
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, page }),
    keepalive: true,
  }).catch(() => {});
}

export function AnalyticsBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    const page = pathname || '/';
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const run = () => {
      if (!cancelled) track(page);
    };

    // Defer non-critical analytics slightly to avoid competing with above-the-fold work.
    // Prefer idle callback when available, with a small timeout fallback.
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      const onVisible = () => {
        document.removeEventListener('visibilitychange', onVisible);
        run();
      };
      document.addEventListener('visibilitychange', onVisible, { once: true });
      return () => {
        cancelled = true;
        document.removeEventListener('visibilitychange', onVisible);
      };
    }

    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof win.requestIdleCallback === 'function') {
      const idleId = win.requestIdleCallback(() => run(), { timeout: 1500 });
      return () => {
        cancelled = true;
        if (typeof win.cancelIdleCallback === 'function') win.cancelIdleCallback(idleId);
      };
    }

    timeoutId = setTimeout(run, 250);
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [pathname]);

  return null;
}
