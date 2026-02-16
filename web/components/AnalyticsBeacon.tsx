'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001';

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
  fetch(`${API_URL}/analytics/track`, {
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
    track(page);
  }, [pathname]);

  return null;
}
