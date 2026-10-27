'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getApiUrl } from '@/lib/site-config';
import { useLanguage, useT } from '@/context/LanguageContext';
import { formatInteger } from '@/lib/intl-locale';
import { useCurrency } from '@/context/CurrencyContext';
import type { HomePublicStats } from '@/lib/home-public-data';
import { HomeNativeMatchRail } from '@/components/HomeNativeMatchRail';
import type { TodayMatchRow } from '@/lib/home-today-matches';

const defaultStats: HomePublicStats = {
  verifiedTipsters: 0,
  totalPicks: 0,
  activePicks: 0,
  successfulPurchases: 0,
  winRate: 0,
  totalPaidOut: 0,
};

type StatKey = 'verified' | 'marketplacePurchases' | 'paidOut';

const STAT_HINT_KEYS: Record<StatKey, string> = {
  verified: 'home.stats_hint_tipsters',
  marketplacePurchases: 'home.stats_hint_marketplace_purchases',
  paidOut: 'home.stats_hint_paid_out',
};

const STAT_LABEL_KEYS: Record<StatKey, string> = {
  verified: 'home.stats_tipsters',
  marketplacePurchases: 'home.stats_marketplace_purchases',
  paidOut: 'home.stats_paid_out',
};

export interface HomeHeroProps {
  initialStats?: HomePublicStats | null;
  initialTodayMatches?: TodayMatchRow[];
  marketplaceItems?: Record<string, unknown>[];
}

/** Below-fold match rail + platform snapshot. Hero banner streams separately. */
export function HomeHero({
  initialStats = null,
  initialTodayMatches = [],
  marketplaceItems = [],
}: HomeHeroProps) {
  const t = useT();
  const { lang } = useLanguage();
  const { format } = useCurrency();
  const [stats, setStats] = useState<HomePublicStats | null>(initialStats);

  useEffect(() => {
    const fetchStats = () => {
      fetch(getApiUrl() + '/accumulators/stats/public', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) setStats(data);
        })
        .catch(() => {
          if (!initialStats) setStats(defaultStats);
        });
    };

    fetchStats();
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchStats();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [initialStats]);

  const s = stats || initialStats || defaultStats;
  const paidOutFormatted = format(s.totalPaidOut).primary;

  const statItems: { key: StatKey; value: string }[] = [
    { key: 'verified', value: formatInteger(s.verifiedTipsters, lang) },
    { key: 'marketplacePurchases', value: formatInteger(s.successfulPurchases, lang) },
    ...(s.totalPaidOut > 0 ? [{ key: 'paidOut' as const, value: paidOutFormatted }] : []),
  ];

  return (
    <section className="w-full min-w-0 border-b border-[var(--separator)] bg-[var(--bg)]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] md:text-sm">
              {t('home.featured_matches_title')}
            </h2>
            <Link
              href="/live-scores"
              className="touch-target inline-flex items-center text-xs font-semibold text-[var(--primary)] whitespace-nowrap md:text-sm"
            >
              {t('home.today_matches_see_all')} →
            </Link>
          </div>
          <HomeNativeMatchRail
            initialMatches={initialTodayMatches}
            marketplaceItems={marketplaceItems}
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            {t('home.app_snapshot_title')}
          </p>
          <div
            className={`ios-grouped-section mx-0 grid grid-cols-1 divide-y divide-[var(--separator)] sm:divide-x sm:divide-y-0 ${
              statItems.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
            }`}
          >
            {statItems.map((item) => (
              <div
                key={item.key}
                title={t(STAT_HINT_KEYS[item.key])}
                className="min-w-0 px-4 py-4 text-center sm:py-3 sm:text-left"
              >
                <p
                  className="text-xl font-bold tabular-nums text-[var(--text)] md:text-2xl"
                  suppressHydrationWarning={item.key === 'paidOut'}
                >
                  {item.value}
                </p>
                <p className="mt-0.5 text-xs text-[var(--text-muted)] md:text-sm">
                  {t(STAT_LABEL_KEYS[item.key])}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
