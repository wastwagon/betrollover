'use client';

import { useEffect, useState } from 'react';

import { getApiUrl } from '@/lib/site-config';

interface PublicStats {
  verifiedTipsters: number;
  totalPicks: number;
  activePicks: number;
  successfulPurchases: number;
  winRate: number;
  totalPaidOut: number;
}

const defaultStats: PublicStats = {
  verifiedTipsters: 0,
  totalPicks: 0,
  activePicks: 0,
  successfulPurchases: 0,
  winRate: 0,
  totalPaidOut: 0,
};

/** Show real counts (no + or rounding). */
function formatNumber(n: number): string {
  if (n <= 0) return '0';
  return n.toLocaleString();
}

export function HomeStats() {
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    fetch(`${getApiUrl()}/accumulators/stats/public`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setStats(data))
      .catch(() => setStats(defaultStats));
  }, []);

  const s = stats || defaultStats;

  const items = [
    { value: formatNumber(s.verifiedTipsters), label: 'Verified Tipsters' },
    { value: formatNumber(s.totalPicks), label: 'Tips Verified' },
    { value: `${s.winRate}%`, label: 'Win Rate' },
    { value: s.totalPaidOut > 0 ? `GHS ${s.totalPaidOut.toLocaleString()}` : 'GHS 0', label: 'Paid Out' },
  ];

  return (
    <section className="border-y border-[var(--border)] bg-gradient-to-br from-[var(--card)] via-[var(--card)] to-[var(--primary)]/5">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {items.map((item) => (
            <div key={item.label} className="text-center group">
              <p className="text-xl md:text-2xl font-bold text-[var(--primary)] tabular-nums group-hover:scale-105 transition-transform">{item.value}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
