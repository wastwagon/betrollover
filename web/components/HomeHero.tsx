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

const statIcons: Record<string, string> = {
  'Verified Tipsters': '✓',
  'Tips Processed': '📊',
  'Win Rate': '📈',
  'Paid Out': '💰',
};

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
    <section className="relative overflow-hidden bg-slate-950">
      {/* Premium gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.07] via-transparent to-transparent" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.15),transparent)]" aria-hidden="true" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" aria-hidden="true" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-emerald-600/5 rounded-full blur-3xl" aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-28">
        <div className="text-center max-w-3xl mx-auto mb-14 md:mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-5">
            Your Shield Against Losses
          </h1>
          <p className="text-lg md:text-xl text-slate-400 mb-8 leading-relaxed max-w-2xl mx-auto">
            Risk-free football betting tips with escrow protection. When our tipsters&apos; coupons lose, you get a full refund.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-3.5 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
            >
              Join Free
            </Link>
            <Link
              href="/marketplace"
              className="px-8 py-3.5 rounded-xl border border-slate-600 text-slate-300 font-semibold hover:bg-slate-800/50 hover:border-slate-500 transition-all duration-200"
            >
              Explore Picks
            </Link>
          </div>
        </div>

        {/* Modern KPI Dashboard */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {statItems.map((item) => (
            <div
              key={item.label}
              className="group relative overflow-hidden rounded-2xl bg-slate-900/80 backdrop-blur-sm border border-slate-800/80 p-5 md:p-6 hover:border-slate-700/80 hover:bg-slate-800/50 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-emerald-400 text-lg">
                  {statIcons[item.label] ?? '•'}
                </span>
                <div className="min-w-0">
                  <p className="text-2xl md:text-3xl font-bold text-white tabular-nums tracking-tight">
                    {item.value}
                  </p>
                  <p className="text-sm text-slate-400 mt-0.5 font-medium">{item.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
