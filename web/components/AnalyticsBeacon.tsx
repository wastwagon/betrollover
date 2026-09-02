'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  buildPageViewPayload,
  shouldSkipAnalyticsBeacon,
} from '@/lib/analytics-client';

function track(page: string) {
  if (shouldSkipAnalyticsBeacon()) return;
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildPageViewPayload(page)),
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
