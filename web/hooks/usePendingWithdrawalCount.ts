'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { getApiUrl } from '@/lib/site-config';
import { AUTH_STORAGE_SYNC } from '@/lib/auth-storage-sync';

export const PENDING_WITHDRAWALS_INVALIDATE = 'betrollover-pending-withdrawals-invalidate';

const CACHE_TTL_MS = 3500;

let cacheAt = 0;
let cacheCount = 0;
let inFlight: Promise<number> | null = null;

function fetchPendingCount(): Promise<number> {
  const now = Date.now();
  if (now - cacheAt < CACHE_TTL_MS) {
    return Promise.resolve(cacheCount);
  }
  if (inFlight) return inFlight;

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) {
    cacheCount = 0;
    cacheAt = now;
    return Promise.resolve(0);
  }

  inFlight = fetch(`${getApiUrl()}/wallet/withdrawals`, { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => (r.ok ? r.json() : []))
    .then((arr: unknown) => {
      const list = Array.isArray(arr) ? arr : [];
      const n = list.filter((w: { status?: string }) => w.status === 'pending' || w.status === 'processing').length;
      cacheCount = n;
      cacheAt = Date.now();
      return n;
    })
    .catch(() => {
      cacheCount = 0;
      cacheAt = Date.now();
      return 0;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/**
 * Count of withdrawals with status pending or processing for the signed-in user.
 * Shares a short-lived cache + single in-flight request across all hook instances (header, nav, dashboard).
 * Refetches on route change and when the tab becomes visible / window focused.
 */
export function usePendingWithdrawalCount(): number {
  const pathname = usePathname();
  const [count, setCount] = useState(() => cacheCount);

  const refresh = useCallback(() => {
    cacheAt = 0;
    fetchPendingCount().then(setCount).catch(() => setCount(0));
  }, []);

  useEffect(() => {
    cacheAt = 0;
    let cancelled = false;
    fetchPendingCount().then((n) => {
      if (!cancelled) setCount(n);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const onFocus = () => refresh();
    const onInvalidate = () => refresh();
    const onAuthSync = () => refresh();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    window.addEventListener(PENDING_WITHDRAWALS_INVALIDATE, onInvalidate);
    window.addEventListener(AUTH_STORAGE_SYNC, onAuthSync);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(PENDING_WITHDRAWALS_INVALIDATE, onInvalidate);
      window.removeEventListener(AUTH_STORAGE_SYNC, onAuthSync);
    };
  }, [refresh]);

  return count;
}
