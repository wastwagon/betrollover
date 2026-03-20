'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getApiUrl } from '@/lib/site-config';
import { useT } from '@/context/LanguageContext';
import { useCurrency } from '@/context/CurrencyContext';

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

/** Show real counts (no + or rounding). Uses locale grouping for thousands. */
function formatNumber(n: number): string {
  if (n <= 0) return '0';
  return n.toLocaleString();
}

/** Min settled picks (wins + losses) before we show someone as "leading" — avoids 100% from 1 pick */
const MIN_SETTLED_FOR_LEADING = 10;

/** Current leading tipster from leaderboard (win rate & ROI) — varies as leader changes */
interface LeadingTipsterStats {
  winRate: number | null;
  roi: number | null;
}

/** Six stats: platform counts + leading ROI + paid out (escrow settled) */
type StatKey =
  | 'verified'
  | 'coupons'
  | 'couponsBought'
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
  coupons: {
    labelKey: 'home.stats_picks',
    icon: '📊',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/40',
    iconBg: 'bg-blue-500/25 text-blue-300',
  },
  couponsBought: {
    labelKey: 'home.stats_coupons_bought',
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

export function HomeHero() {
  const t = useT();
  const { format } = useCurrency();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [leadingTipster, setLeadingTipster] = useState<LeadingTipsterStats>({ winRate: null, roi: null });
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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
      const topWithEnoughSettled = entries.find((e) => settled(e) >= MIN_SETTLED_FOR_LEADING);
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

  useEffect(() => {
    setIsLoggedIn(!!(typeof window !== 'undefined' && localStorage.getItem('token')));
    const onStorage = () => setIsLoggedIn(!!localStorage.getItem('token'));
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const s = stats || defaultStats;
  const paidOutFormatted = format(s.totalPaidOut).primary;

  const leadingRoiStr =
    leadingTipster.roi != null ? Number(leadingTipster.roi).toFixed(1) + '%' : '—';

  const statItems: { key: StatKey; value: string }[] = [
    { key: 'verified', value: formatNumber(s.verifiedTipsters) },
    { key: 'coupons', value: formatNumber(s.totalPicks) },
    { key: 'couponsBought', value: formatNumber(s.successfulPurchases) },
    { key: 'leadingRoi', value: leadingRoiStr },
    { key: 'marketplace', value: formatNumber(s.activePicks) },
    { key: 'paidOut', value: paidOutFormatted },
  ];

  return (
    <section className="relative overflow-hidden min-h-[560px] md:min-h-[640px]">
      {/* Full-bleed hero artwork — replaces previous CSS gradients */}
      <div className="absolute inset-0">
        <Image
          src="/images/marketing/hero-panel.png"
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-28">
        <h1 className="sr-only">{t('home.hero_title')}</h1>
        <div className="text-center max-w-3xl mx-auto mb-14 md:mb-16">
          <p className="text-lg sm:text-xl md:text-2xl text-white leading-relaxed font-medium mb-4 md:mb-5 animate-fade-in-up [text-shadow:0_1px_2px_rgba(0,0,0,0.85),0_2px_12px_rgba(0,0,0,0.45)]">
            {t('home.hero_subtitle')}
          </p>
          <p className="text-sm sm:text-base text-white/95 leading-snug mb-8 md:mb-10 animate-fade-in-up max-w-2xl mx-auto [text-shadow:0_1px_2px_rgba(0,0,0,0.8),0_2px_8px_rgba(0,0,0,0.4)]">
            {t('home.hero_escrow_line')}
          </p>

          <div className="flex flex-wrap gap-4 justify-center animate-fade-in-up animate-delay-100">
            {!isLoggedIn && (
              <Link
                href="/register"
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold hover:from-emerald-400 hover:to-emerald-500 hover:scale-105 transition-all duration-300 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:shadow-xl"
              >
                {t('home.join_cta')}
              </Link>
            )}
            <Link
              href="/marketplace"
              className="px-8 py-3.5 rounded-xl border-2 border-white/50 bg-white/10 text-white font-semibold hover:bg-white/20 hover:border-white/70 transition-all duration-200 backdrop-blur-sm"
            >
              {t('home.hero_cta_primary')}
            </Link>
          </div>
          <p className="text-[11px] sm:text-xs text-white/85 mt-6 sm:mt-7 max-w-xl mx-auto leading-relaxed px-2 [text-shadow:0_1px_2px_rgba(0,0,0,0.75)]">
            {t('home.hero_informational_note')}
          </p>
        </div>

        {/* Compact KPI Dashboard - 6 cards: platform + leading ROI + paid out */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
          {statItems.map((item, idx) => {
            const cfg = statConfigBase[item.key];
            return (
              <div
                key={item.key}
                className={`group relative overflow-hidden rounded-xl backdrop-blur-sm border ${cfg.bg} ${cfg.border} px-3 py-2.5 md:px-4 md:py-3 hover:opacity-90 transition-all duration-300 animate-fade-in-up`}
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
