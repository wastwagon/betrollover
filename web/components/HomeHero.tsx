'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getApiUrl } from '@/lib/site-config';
import { useT } from '@/context/LanguageContext';
import { useCurrency } from '@/context/CurrencyContext';
import type { HomePublicStats } from '@/lib/home-public-data';
import { HomeMatchSlider } from '@/components/HomeMatchSlider';
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

const statConfigBase: Record<
  StatKey,
  { labelKey: string; icon: string; bg: string; border: string; iconBg: string }
> = {
  verified: {
    labelKey: 'home.stats_tipsters',
    icon: '✓',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/40',
    iconBg: 'bg-emerald-500/25 text-emerald-300',
  },
  marketplacePurchases: {
    labelKey: 'home.stats_marketplace_purchases',
    icon: '🛍️',
    bg: 'bg-sky-500/15',
    border: 'border-sky-500/40',
    iconBg: 'bg-sky-500/25 text-sky-300',
  },
  paidOut: {
    labelKey: 'home.stats_paid_out',
    icon: '🏆',
    bg: 'bg-cyan-500/15',
    border: 'border-cyan-500/40',
    iconBg: 'bg-cyan-500/25 text-cyan-300',
  },
};

const STAT_HINT_KEYS: Record<StatKey, string> = {
  verified: 'home.stats_hint_tipsters',
  marketplacePurchases: 'home.stats_hint_marketplace_purchases',
  paidOut: 'home.stats_hint_paid_out',
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
    <>
      <section className="md:hidden w-full min-w-0 bg-[var(--bg)] px-4 pt-5 pb-7">
        <div className="mb-5">
          <p className="text-[13px] font-semibold text-[var(--primary)]">{t('home.hero_badge')}</p>
          <h1 className="mt-1 text-[34px] font-bold tracking-tight leading-none text-[var(--text)]">
            {t('home.app_today_title')}
          </h1>
          <p className="mt-2 text-[15px] leading-snug text-[var(--text-muted)]">
            {t('home.app_today_subtitle')}
          </p>
        </div>

        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {t('home.today_matches_title')}
            </h2>
            <Link href="/live-scores" className="text-[13px] font-semibold text-[var(--primary)]">
              {t('home.today_matches_see_all')}
            </Link>
          </div>
          <HomeNativeMatchRail initialMatches={initialTodayMatches} marketplaceItems={marketplaceItems} />
        </div>

        <section className="mb-6">
          <p className="px-1 mb-1.5 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            {t('home.app_snapshot_title')}
          </p>
          <div className="ios-grouped-section mx-0 grid grid-cols-3 divide-x divide-[var(--separator)]">
            {statItems.map((item) => {
              const cfg = statConfigBase[item.key];
              return (
                <div key={item.key} title={t(STAT_HINT_KEYS[item.key])} className="min-w-0 px-2 py-3 text-center">
                  <p className="text-[17px] font-bold tabular-nums text-[var(--text)] truncate">{item.value}</p>
                  <p className="mt-0.5 text-[11px] leading-tight text-[var(--text-muted)] truncate">
                    {t(cfg.labelKey)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <div className="ios-grouped-section mx-0 overflow-hidden">
          <Link
            href="/marketplace"
            className="ios-list-row flex min-h-[48px] items-center justify-between border-b border-[var(--separator)] px-4 text-[15px] font-semibold text-[var(--text)] active:bg-[var(--fill-secondary)]"
          >
            <span>{t('home.hero_cta_primary')}</span>
            <span className="text-[var(--text-tertiary)]" aria-hidden>
              ›
            </span>
          </Link>
          <Link
            href="/register"
            className="ios-list-row flex min-h-[48px] items-center justify-between px-4 text-[15px] font-semibold text-[var(--text)] active:bg-[var(--fill-secondary)]"
          >
            <span>{t('home.hero_cta_secondary')}</span>
            <span className="text-[var(--text-tertiary)]" aria-hidden>
              ›
            </span>
          </Link>
        </div>

        <p className="px-1 pt-3 text-xs leading-relaxed text-[var(--text-muted)]">
          {t('home.hero_escrow_line')}
        </p>
      </section>

      <section className="relative hidden overflow-hidden w-full min-w-0 max-w-full bg-slate-950 md:block">
      <div className="absolute inset-0 min-h-[520px] sm:min-h-[580px] md:min-h-[640px]">
        {/* eslint-disable-next-line @next/next/no-img-element -- static AVIF/WebP pair */}
        <picture className="absolute inset-0 block h-full min-h-full w-full">
          <source srcSet="/images/marketing/hero-cinematic.avif" type="image/avif" />
          <img
            src="/images/marketing/hero-cinematic.webp"
            alt=""
            width={1376}
            height={768}
            className="absolute inset-0 h-full w-full object-cover object-center opacity-95 scale-105"
            fetchPriority="high"
            decoding="sync"
          />
        </picture>
        <div
          className="absolute inset-0 bg-gradient-to-b from-slate-950/55 via-slate-950/75 to-slate-950 pointer-events-none"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_20%,rgba(16,185,129,0.12),transparent_55%)] pointer-events-none"
          aria-hidden
        />
      </div>

      <div className="relative max-w-7xl mx-auto section-ux-hero !pb-8 sm:!pb-10 md:!pb-12 w-full min-w-0 flex flex-col gap-6 md:gap-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 lg:gap-8 animate-fade-in-up" style={{ animationFillMode: 'both' }}>
          <div className="max-w-xl min-w-0">
            <p className="text-emerald-300 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] mb-2">
              {t('home.hero_badge')}
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-[2.5rem] font-bold text-white tracking-tight leading-[1.15]">
              {t('home.hero_title')}
            </h1>
            <p className="text-slate-200/95 text-sm sm:text-base mt-2.5 leading-relaxed max-w-lg">
              {t('home.hero_subtitle')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3 shrink-0">
            <Link
              href="/marketplace"
              className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold shadow-lg shadow-emerald-900/35 transition-colors"
            >
              {t('home.hero_cta_primary')}
            </Link>
            <Link
              href="/live-scores"
              className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-xl border border-white/30 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold backdrop-blur-sm transition-colors"
            >
              {t('home.hero_cta_live')}
            </Link>
          </div>
        </div>

        <div className="animate-fade-in-up" style={{ animationDelay: '120ms', animationFillMode: 'both' }}>
          <div className="flex items-center justify-between gap-3 mb-3 px-0.5">
            <p className="text-xs sm:text-sm font-semibold text-emerald-200/90 uppercase tracking-wide">
              {t('home.today_matches_title')}
            </p>
            <Link
              href="/live-scores"
              className="text-xs font-semibold text-white/80 hover:text-white whitespace-nowrap"
            >
              {t('home.today_matches_see_all')} →
            </Link>
          </div>
          <HomeMatchSlider
            initialMatches={initialTodayMatches}
            marketplaceItems={marketplaceItems}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 min-w-0">
          {statItems.map((item, idx) => {
            const cfg = statConfigBase[item.key];
            return (
              <div
                key={item.key}
                title={t(STAT_HINT_KEYS[item.key])}
                className={`group relative overflow-hidden rounded-xl backdrop-blur-md border ${cfg.bg} ${cfg.border} px-3 py-2.5 md:px-4 md:py-3 hover:border-white/30 transition-all duration-200 animate-fade-in-up`}
                style={{ animationDelay: `${240 + idx * 60}ms`, animationFillMode: 'both' as const }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm ${cfg.iconBg}`}
                  >
                    {cfg.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-lg md:text-xl font-bold text-white tabular-nums tracking-tight leading-tight">
                      {item.value}
                    </p>
                    <p className="text-xs text-slate-300 font-medium truncate">{t(cfg.labelKey)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] sm:text-xs text-slate-400/90 leading-relaxed max-w-3xl">
          {t('home.hero_escrow_line')}
        </p>
      </div>
      </section>
    </>
  );
}
