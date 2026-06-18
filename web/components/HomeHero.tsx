'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getApiUrl } from '@/lib/site-config';
import { useT } from '@/context/LanguageContext';
import { useCurrency } from '@/context/CurrencyContext';
import type { HomePublicStats } from '@/lib/home-public-data';
import { HomeTodayMatches } from '@/components/HomeTodayMatches';
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
    <section className="relative overflow-hidden w-full min-w-0 max-w-full bg-slate-950">
      <div className="absolute inset-0 min-h-[360px] sm:min-h-[400px]">
        {/* eslint-disable-next-line @next/next/no-img-element -- static AVIF/WebP pair */}
        <picture className="absolute inset-0 block h-full min-h-full w-full">
          <source srcSet="/images/marketing/hero-cinematic.avif" type="image/avif" />
          <img
            src="/images/marketing/hero-cinematic.webp"
            alt=""
            width={1376}
            height={768}
            className="absolute inset-0 h-full w-full object-cover object-[center_30%] sm:object-center opacity-90"
            fetchPriority="high"
            decoding="sync"
          />
        </picture>
        <div
          className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-slate-950/60 to-slate-950/95 pointer-events-none"
          aria-hidden
        />
      </div>

      <div className="relative max-w-7xl mx-auto section-ux-hero !pb-6 sm:!pb-8 w-full min-w-0 flex flex-col gap-5 md:gap-6">
        <div className="max-w-2xl animate-fade-in-up" style={{ animationFillMode: 'both' }}>
          <p className="text-emerald-300/95 text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-2">
            {t('home.hero_badge')}
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-[2.35rem] font-bold text-white tracking-tight leading-tight">
            {t('home.hero_title')}
          </h1>
          <p className="text-slate-200 text-sm sm:text-base mt-2 leading-relaxed max-w-xl">
            {t('home.hero_subtitle')}
          </p>
          <p className="text-emerald-100/85 text-xs sm:text-sm mt-2 leading-relaxed max-w-xl">
            {t('home.hero_escrow_line')}
          </p>
          <div className="flex flex-wrap gap-2 sm:gap-3 mt-4">
            <Link
              href="/marketplace"
              className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold shadow-lg shadow-emerald-900/30 transition-colors"
            >
              {t('home.hero_cta_primary')}
            </Link>
            <Link
              href="/live-scores"
              className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-xl border border-white/25 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold backdrop-blur-sm transition-colors"
            >
              {t('home.hero_cta_live')}
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-xl text-emerald-200/90 hover:text-white text-sm font-medium transition-colors"
            >
              {t('home.hero_cta_secondary')} →
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 min-w-0 max-w-3xl">
          {statItems.map((item, idx) => {
            const cfg = statConfigBase[item.key];
            return (
              <div
                key={item.key}
                title={t(STAT_HINT_KEYS[item.key])}
                className={`group relative overflow-hidden rounded-xl backdrop-blur-sm border ${cfg.bg} ${cfg.border} px-3 py-2.5 md:px-4 md:py-3 hover:opacity-90 transition-all duration-200 ease-out animate-fade-in-up`}
                style={{ animationDelay: `${200 + idx * 60}ms`, animationFillMode: 'both' as const }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${cfg.iconBg}`}
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
      </div>

      <HomeTodayMatches
        initialMatches={initialTodayMatches}
        marketplaceItems={marketplaceItems}
      />
    </section>
  );
}
