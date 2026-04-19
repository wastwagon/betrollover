'use client';

import { useEffect, useState } from 'react';
import { getApiUrl } from '@/lib/site-config';
import { useT } from '@/context/LanguageContext';
import { useCurrency } from '@/context/CurrencyContext';
import { LEADERBOARD_MIN_SETTLED_FOR_PRIMARY_RANKING } from '@betrollover/shared-types';

interface PublicStats {
  verifiedTipsters: number;
  totalPicks: number;
  activePicks: number;
  successfulPurchases: number;
  winRate: number;
  totalPaidOut: number;
  /** Gross buyer stakes on wins (optional; net tipster pay is totalPaidOut) */
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

/** Show real counts (no + or rounding). Uses locale grouping for thousands. */
function formatNumber(n: number): string {
  if (n <= 0) return '0';
  return n.toLocaleString();
}

/** Current leading tipster from leaderboard (win rate & ROI) — varies as leader changes */
interface LeadingTipsterStats {
  winRate: number | null;
  roi: number | null;
}

/** Six stats: platform counts + leading ROI + net paid to tipsters (wallet payouts) */
type StatKey =
  | 'verified'
  | 'settledPicks'
  | 'marketplacePurchases'
  | 'leadingRoi'
  | 'marketplace'
  | 'paidOut';

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
  settledPicks: {
    labelKey: 'home.stats_picks',
    icon: '📊',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/40',
    iconBg: 'bg-blue-500/25 text-blue-300',
  },
  marketplacePurchases: {
    labelKey: 'home.stats_marketplace_purchases',
    icon: '🛍️',
    bg: 'bg-sky-500/15',
    border: 'border-sky-500/40',
    iconBg: 'bg-sky-500/25 text-sky-300',
  },
  leadingRoi: {
    labelKey: 'home.stats_leading_roi',
    icon: '💰',
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/40',
    iconBg: 'bg-rose-500/25 text-rose-300',
  },
  marketplace: {
    labelKey: 'home.stats_marketplace',
    icon: '🛒',
    bg: 'bg-violet-500/15',
    border: 'border-violet-500/40',
    iconBg: 'bg-violet-500/25 text-violet-300',
  },
  paidOut: {
    labelKey: 'home.stats_paid_out',
    icon: '🏆',
    bg: 'bg-cyan-500/15',
    border: 'border-cyan-500/40',
    iconBg: 'bg-cyan-500/25 text-cyan-300',
  },
};

/** Native tooltips: how each KPI is computed (hover). */
const STAT_HINT_KEYS: Record<StatKey, string> = {
  verified: 'home.stats_hint_tipsters',
  settledPicks: 'home.stats_hint_settled_picks',
  marketplacePurchases: 'home.stats_hint_marketplace_purchases',
  leadingRoi: 'home.stats_hint_leading_roi',
  marketplace: 'home.stats_hint_marketplace',
  paidOut: 'home.stats_hint_paid_out',
};

export function HomeHero() {
  const t = useT();
  const { format } = useCurrency();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [leadingTipster, setLeadingTipster] = useState<LeadingTipsterStats>({ winRate: null, roi: null });

  const fetchStats = () => {
    Promise.all([
      fetch(getApiUrl() + '/accumulators/stats/public', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
      fetch(getApiUrl() + '/leaderboard?period=all_time&limit=20', { cache: 'no-store' }).then((r) =>
        r.ok ? r.json() : { leaderboard: [] },
      ),
    ]).then(([data, leaderData]) => {
      if (data) setStats(data);
      const entries = (leaderData?.leaderboard || []) as {
        win_rate?: number;
        roi?: number;
        total_wins?: number;
        total_losses?: number;
      }[];
      const settled = (e: (typeof entries)[0]) => (e.total_wins ?? 0) + (e.total_losses ?? 0);
      const topWithEnoughSettled = entries.find(
        (e) => settled(e) >= LEADERBOARD_MIN_SETTLED_FOR_PRIMARY_RANKING,
      );
      if (topWithEnoughSettled) {
        setLeadingTipster({
          winRate: typeof topWithEnoughSettled.win_rate === 'number' ? topWithEnoughSettled.win_rate : null,
          roi: typeof topWithEnoughSettled.roi === 'number' ? topWithEnoughSettled.roi : null,
        });
      } else {
        setLeadingTipster({ winRate: null, roi: null });
      }
    }).catch(() => setStats(defaultStats));
  };

  useEffect(() => {
    fetchStats();
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchStats();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const s = stats || defaultStats;
  const paidOutFormatted = format(s.totalPaidOut).primary;

  const leadingRoiStr =
    leadingTipster.roi != null ? Number(leadingTipster.roi).toFixed(1) + '%' : '—';

  const statItems: { key: StatKey; value: string }[] = [
    { key: 'verified', value: formatNumber(s.verifiedTipsters) },
    { key: 'settledPicks', value: formatNumber(s.totalPicks) },
    { key: 'marketplacePurchases', value: formatNumber(s.successfulPurchases) },
    { key: 'leadingRoi', value: leadingRoiStr },
    { key: 'marketplace', value: formatNumber(s.activePicks) },
    { key: 'paidOut', value: paidOutFormatted },
  ];

  return (
    <section className="relative overflow-hidden min-h-[380px] sm:min-h-[420px] md:min-h-[480px] w-full min-w-0 max-w-full">
      {/* Photoreal hero — AVIF (~40KB) + WebP (~52KB) @ 1376×768; no SVG collage */}
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element -- static AVIF/WebP pair; avoids optimizer re-encoding */}
        <picture className="absolute inset-0 block h-full min-h-full w-full">
          <source srcSet="/images/marketing/hero-cinematic.avif" type="image/avif" />
          <img
            src="/images/marketing/hero-cinematic.webp"
            alt=""
            width={1376}
            height={768}
            className="absolute inset-0 h-full w-full object-cover object-center"
            fetchPriority="high"
            decoding="sync"
          />
        </picture>
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/30 pointer-events-none"
          aria-hidden
        />
      </div>

      <div className="relative max-w-7xl mx-auto section-ux-hero w-full min-w-0">
        <h1 className="sr-only">{t('home.hero_title')}</h1>
        {/* Compact KPI Dashboard - 6 cards: platform + leading ROI + paid out */}
        {/* sm=640px: avoid 2-up stats on typical phone widths (390–430), which looked like a shrunk desktop layout in store shots */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3 min-w-0">
          {statItems.map((item, idx) => {
            const cfg = statConfigBase[item.key];
            return (
              <div
                key={item.key}
                title={t(STAT_HINT_KEYS[item.key])}
                className={`group relative overflow-hidden rounded-xl backdrop-blur-sm border ${cfg.bg} ${cfg.border} px-3 py-2.5 md:px-4 md:py-3 hover:opacity-90 transition-all duration-200 ease-out animate-fade-in-up`}
                style={{ animationDelay: `${300 + idx * 60}ms`, animationFillMode: 'both' as const }}
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
    </section>
  );
}
