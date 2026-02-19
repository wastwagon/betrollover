'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/site-config';

interface Notification {
  id: number;
  isRead: boolean;
}

export function DashboardHeader() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${getApiUrl()}/wallet/balance`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setBalance(Number(data.balance)))
      .catch(() => {});
    fetch(`${getApiUrl()}/notifications?limit=20`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((arr: Notification[]) => setUnreadCount(arr.filter((n) => !n.isRead).length))
      .catch(() => {});
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('token');
    router.push('/');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-xl border-b border-[var(--border)] safe-area-inset-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-5 md:px-6 h-14 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 font-semibold text-[var(--text)] hover:opacity-90 transition-opacity shrink-0"
        >
          <span className="w-9 h-9 rounded-xl bg-[var(--primary)] flex items-center justify-center text-white text-xs font-bold shadow-md">
            BR
          </span>
          <span className="tracking-tight hidden sm:inline">BetRollover</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {balance !== null && (
            <Link
              href="/wallet"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-[var(--primary)] bg-[var(--primary-light)] hover:bg-emerald-100 border border-emerald-200/60 transition-all"
            >
              <span className="tabular-nums">GHS {balance.toFixed(2)}</span>
            </Link>
          )}
          <Link
            href="/notifications"
            className="relative p-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-warm)] transition-colors"
            aria-label="Notifications"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-[var(--accent)] text-white rounded-full ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="p-2.5 rounded-xl text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-warm)] transition-colors"
            aria-label="Sign out"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
