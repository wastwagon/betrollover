'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { NotificationBellMenu } from '@/components/notifications/NotificationBellMenu';
import { getApiUrl } from '@/lib/site-config';
import { emitAuthStorageSync } from '@/lib/auth-storage-sync';
import { useCurrency } from '@/context/CurrencyContext';

export function DashboardHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { format, currency } = useCurrency();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${getApiUrl()}/wallet/balance`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setBalance(Number(data.balance)))
      .catch(() => {});
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('token');
    emitAuthStorageSync();
    router.push('/');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 w-full min-w-0 max-w-full overflow-x-hidden bg-white/95 backdrop-blur-xl border-b border-[var(--border)] safe-area-inset-top">
      <div className="section-ux-gutter-wide h-14 flex items-center justify-between min-w-0 max-w-full gap-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 font-semibold text-[var(--text)] hover:opacity-90 transition-opacity shrink-0"
        >
          <span className="w-9 h-9 rounded-xl bg-[var(--primary)] flex items-center justify-center text-white text-xs font-bold shadow-md">
            BR
          </span>
          <span className="tracking-tight hidden sm:inline">BetRollover</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {balance !== null && (
            <Link
              href="/wallet"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-[var(--primary)] bg-[var(--primary-light)] hover:bg-emerald-100 border border-emerald-200/60 transition-all"
            >
              <span className="tabular-nums">{format(balance).primary}</span>
              {currency.code !== 'GHS' && (
                <span className="text-[10px] font-normal opacity-80">GHS {balance.toFixed(2)}</span>
              )}
            </Link>
          )}
          <NotificationBellMenu refreshKey={pathname} variant="dashboard" />
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
