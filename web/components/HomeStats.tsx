'use client';

import { useEffect, useState } from 'react';

import { getApiUrl } from '@/lib/site-config';
import { useCurrency } from '@/context/CurrencyContext';
import { useT } from '@/context/LanguageContext';

interface PublicStats {
  verifiedTipsters: number;
  totalPicks: number;
  activePicks: number;
  successfulPurchases: number;
  winRate: number;
  totalPaidOut: number;
  grossWinningStakesGhs?: number;
  statsScope?: string;
  platformCommissionPercent?: number;
  metricNotes?: Record<string, string>;
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
  const { format } = useCurrency();
  const t = useT();
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    fetch(`${getApiUrl()}/accumulators/stats/public`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setStats(data))
      .catch(() => setStats(defaultStats));
  }, []);

  const s = stats || defaultStats;

  const items: { value: string; label: string; hint: string }[] = [
    { value: formatNumber(s.verifiedTipsters), label: t('home.stats_tipsters'), hint: t('home.stats_hint_tipsters') },
    { value: formatNumber(s.totalPicks), label: t('home.stats_picks'), hint: t('home.stats_hint_settled_picks') },
    { value: formatNumber(s.successfulPurchases), label: t('home.stats_marketplace_purchases'), hint: t('home.stats_hint_marketplace_purchases') },
    { value: `${s.winRate}%`, label: t('home.stats_marketplace_win_rate'), hint: t('home.stats_hint_win_rate') },
    { value: format(s.totalPaidOut).primary, label: t('home.stats_paid_out'), hint: t('home.stats_hint_paid_out') },
  ];

  return (
    <section className="border-y border-[var(--border)] bg-gradient-to-br from-[var(--card)] via-[var(--card)] to-[var(--primary)]/5 w-full min-w-0 max-w-full overflow-x-hidden">
      <div className="section-ux-gutter py-8 w-full min-w-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 min-w-0">
          {items.map((item) => (
            <div key={item.label} className="text-center group" title={item.hint}>
              <p className="text-lg font-semibold text-[var(--primary)] tabular-nums group-hover:scale-105 transition-transform">{item.value}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
