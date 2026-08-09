'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
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
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

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
    <div className="w-full min-w-0">
      {/* Full-bleed football hero — one headline, one line, CTAs */}
      <section
        className="relative w-full min-w-0 overflow-hidden text-white"
        aria-label={t('home.hero_title')}
      >
        <div className="absolute inset-0">
          <picture>
            <source srcSet="/images/marketing/hero-stadium-day.avif" type="image/avif" />
            <Image
              src="/images/marketing/hero-stadium-day.webp"
              alt=""
              fill
              priority
              sizes="100vw"
              className={`object-cover object-[center_42%] brightness-[1.04] contrast-[1.02] saturate-[1.08] transition-transform duration-[1.4s] ease-out ${
                entered ? 'scale-100' : 'scale-105'
              }`}
            />
          </picture>
          {/* Bright stadium overall; left/bottom scrim only for copy contrast */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(105deg, rgba(4, 22, 18, 0.72) 0%, rgba(4, 22, 18, 0.45) 32%, rgba(4, 22, 18, 0.12) 58%, transparent 72%), linear-gradient(180deg, transparent 40%, rgba(4, 22, 18, 0.5) 100%)',
            }}
            aria-hidden
          />
          <div
            className="absolute inset-0 opacity-35"
            style={{
              background:
                'radial-gradient(ellipse 95% 70% at 85% 18%, rgba(255, 255, 255, 0.2), transparent 52%)',
            }}
            aria-hidden
          />
        </div>

        <div className="relative mx-auto flex min-h-[min(68svh,480px)] w-full max-w-7xl flex-col justify-end px-4 pb-8 pt-14 sm:min-h-[400px] sm:px-6 sm:pb-10 sm:pt-16 lg:px-8 lg:pb-12">
          <div
            className={`max-w-xl transition-all duration-700 ease-out ${
              entered ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            }`}
          >
            <h1 className="sr-only">{t('home.hero_title')}</h1>
            <p className="mb-3 inline-flex max-w-full items-center rounded-full border border-emerald-300/40 bg-emerald-950/75 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-50 shadow-[0_4px_20px_-6px_rgba(0,0,0,0.55)] backdrop-blur-md sm:px-3.5 sm:text-[11px]">
              <span className="truncate">{t('home.hero_badge')}</span>
            </p>
            <p
              className="max-w-md text-sm font-semibold leading-relaxed text-white sm:text-[15px]"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.65), 0 2px 18px rgba(0,0,0,0.4)' }}
            >
              {t('home.hero_escrow_line')}
            </p>
          </div>

          <div
            className={`mt-5 flex w-full max-w-md flex-col gap-2.5 transition-all delay-150 duration-700 ease-out sm:mt-7 sm:max-w-none sm:flex-row sm:flex-wrap ${
              entered ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            }`}
          >
            <Link
              href="/marketplace"
              className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(16,185,129,0.55)] transition-colors hover:bg-emerald-400 sm:flex-none sm:min-w-[10.5rem]"
            >
              {t('home.hero_cta_primary')}
            </Link>
            <Link
              href="/tipsters"
              className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl border border-white/45 bg-white/15 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/25 sm:flex-none sm:min-w-[10.5rem]"
            >
              {t('nav.tipsters')}
            </Link>
            <Link
              href="/register"
              className="inline-flex min-h-[48px] items-center justify-center px-2 py-3 text-sm font-semibold text-white underline-offset-4 hover:underline sm:px-4"
            >
              {t('home.hero_cta_secondary')} →
            </Link>
          </div>
        </div>
      </section>

      {/* Below-fold utility: matches + snapshot (kept out of the hero budget) */}
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
            <div className="ios-grouped-section mx-0 grid grid-cols-1 divide-y divide-[var(--separator)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {statItems.map((item) => (
                <div
                  key={item.key}
                  title={t(STAT_HINT_KEYS[item.key])}
                  className="min-w-0 px-4 py-4 text-center sm:py-3 sm:text-left"
                >
                  <p className="text-xl font-bold tabular-nums text-[var(--text)] md:text-2xl">
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
    </div>
  );
}
