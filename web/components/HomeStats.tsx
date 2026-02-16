'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001';

interface PublicStats {
  verifiedTipsters: number;
  totalPicks: number;
  activePicks: number;
  successfulPurchases: number;
  winRate: number;
  totalPaidOut: number;
}

const defaultStats: PublicStats = {
  verifiedTipsters: 7,
  totalPicks: 80,
  activePicks: 30,
  successfulPurchases: 150,
  winRate: 62,
  totalPaidOut: 12500,
};

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K+`;
  if (n >= 100) return `${Math.floor(n / 100) * 100}+`;
  return `${n}+`;
}

export function HomeStats() {
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/accumulators/stats/public`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setStats(data))
      .catch(() => setStats(defaultStats));
  }, []);

  const s = stats || defaultStats;

  const items = [
    { value: formatNumber(s.verifiedTipsters), label: 'Verified Tipsters' },
    { value: formatNumber(s.totalPicks), label: 'Tips Verified' },
    { value: `${s.winRate}%`, label: 'Win Rate' },
    { value: `GHS ${s.totalPaidOut >= 1000 ? `${(s.totalPaidOut / 1000).toFixed(1)}K+` : s.totalPaidOut}+`, label: 'Paid Out' },
  ];

  return (
    <section className="border-y border-[var(--border)] bg-gradient-to-br from-[var(--card)] via-[var(--card)] to-[var(--primary)]/5">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {items.map((item) => (
            <div key={item.label} className="text-center group">
              <p className="text-2xl md:text-3xl font-bold text-[var(--primary)] tabular-nums group-hover:scale-105 transition-transform duration-300">{item.value}</p>
              <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
