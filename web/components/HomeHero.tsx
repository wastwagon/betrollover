'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getApiUrl } from '@/lib/site-config';
import { useT } from '@/context/LanguageContext';
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

function formatNumber(n: number): string {
  if (n <= 0) return '0';
  return n.toLocaleString();
}

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

export function HomeHero({
  initialStats = null,
  initialTodayMatches = [],
  marketplaceItems = [],
}: HomeHeroProps) {
  const t = useT();
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
    { key: 'verified', value: formatNumber(s.verifiedTipsters) },
    { key: 'marketplacePurchases', value: formatNumber(s.successfulPurchases) },
    { key: 'paidOut', value: paidOutFormatted },
  ];

  return (
    <section className="w-full min-w-0 bg-[var(--bg)] border-b border-[var(--separator)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-10 pb-8 md:pb-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 lg:gap-10 mb-8">
          <div className="max-w-2xl min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
              {t('home.hero_badge')}
            </p>
            <h1 className="mt-2 text-2xl md:text-3xl font-bold tracking-tight text-[var(--text)] leading-snug">
              {t('home.hero_title')}
            </h1>
            <p className="mt-2 text-sm md:text-base leading-relaxed text-[var(--text-muted)] max-w-xl">
              {t('home.hero_subtitle')}
            </p>
            <p className="mt-2 text-xs md:text-sm leading-relaxed text-[var(--text-muted)] max-w-xl">
              {t('home.hero_escrow_line')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <Link
              href="/marketplace"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] transition-colors"
            >
              {t('home.hero_cta_primary')}
            </Link>
            <Link
              href="/live-scores"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-2.5 text-sm font-semibold text-[var(--text)] hover:bg-[var(--fill-secondary)] transition-colors"
            >
              {t('home.hero_cta_live')}
            </Link>
            <Link
              href="/register"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--primary)] hover:underline"
            >
              {t('home.hero_cta_secondary')} →
            </Link>
          </div>
        </div>

        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-xs md:text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {t('home.featured_matches_title')}
            </h2>
            <Link
              href="/live-scores"
              className="text-xs md:text-sm font-semibold text-[var(--primary)] whitespace-nowrap"
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
          <div className="ios-grouped-section mx-0 grid grid-cols-1 sm:grid-cols-3 sm:divide-x sm:divide-y-0 divide-y divide-[var(--separator)]">
            {statItems.map((item) => (
              <div
                key={item.key}
                title={t(STAT_HINT_KEYS[item.key])}
                className="min-w-0 px-4 py-4 sm:py-3 text-center sm:text-left"
              >
                <p className="text-xl md:text-2xl font-bold tabular-nums text-[var(--text)]">
                  {item.value}
                </p>
                <p className="mt-0.5 text-xs md:text-sm text-[var(--text-muted)]">
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
