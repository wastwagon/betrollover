'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getApiUrl } from '@/lib/site-config';

interface PublicStats {
  verifiedTipsters: number;
  totalPicks: number;
  activePicks: number;
  winRate: number;
  totalPaidOut: number;
}

const defaultStats: PublicStats = {
  verifiedTipsters: 7,
  totalPicks: 80,
  activePicks: 30,
  winRate: 62,
  totalPaidOut: 12500,
};

function formatNumber(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K+';
  if (n >= 100) return Math.floor(n / 100) * 100 + '+';
  return n + '+';
}

export function HomeHero() {
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    fetch(getApiUrl() + '/accumulators/stats/public')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setStats(data))
      .catch(() => setStats(defaultStats));
  }, []);

  const s = stats || defaultStats;
  const statItems = [
    { value: formatNumber(s.verifiedTipsters), label: 'Verified Tipsters' },
    { value: formatNumber(s.totalPicks), label: 'Tips Processed' },
    { value: s.winRate + '%', label: 'Win Rate' },
    { value: s.totalPaidOut >= 1000 ? 'GHS ' + (s.totalPaidOut / 1000).toFixed(1) + 'K+' : 'GHS ' + s.totalPaidOut + '+', label: 'Paid Out' },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[var(--primary)]/10 via-[var(--bg)] to-[var(--primary)]/5 border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 lg:py-20">
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--text)] mb-4">
            Your Shield Against Losses
          </h1>
          <p className="text-lg text-[var(--text-muted)] mb-6">
            Risk-free football betting tips with escrow protection. When our tipsters&apos; coupons lose, you get a full refund.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/register" className="px-6 py-3 rounded-xl bg-[var(--primary)] text-white font-semibold hover:bg-[var(--primary-hover)] transition-all shadow-lg">
              Join Free
            </Link>
            <Link href="/marketplace" className="px-6 py-3 rounded-xl border-2 border-[var(--primary)] text-[var(--primary)] font-semibold hover:bg-[var(--primary)]/10 transition-all">
              Explore Picks
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {statItems.map((item) => (
            <div key={item.label} className="text-center p-4 rounded-xl bg-white/60 dark:bg-[var(--card)]/80 border border-[var(--border)]">
              <p className="text-xl md:text-2xl font-bold text-[var(--primary)] tabular-nums">{item.value}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
