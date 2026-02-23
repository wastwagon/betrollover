'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getApiUrl } from '@/lib/site-config';
import { useT } from '@/context/LanguageContext';

interface PublicStats {
  verifiedTipsters: number;
  totalPicks: number;
  activePicks: number;
  winRate: number;
  totalPaidOut: number;
}

interface LeaderboardEntry {
  win_rate?: number;
  roi?: number;
  display_name?: string;
}

const defaultStats: PublicStats = {
  verifiedTipsters: 7,
  totalPicks: 80,
  activePicks: 30,
  winRate: 62,
  totalPaidOut: 12500,
};

function formatNumber(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K+';
  if (n >= 100) return Math.floor(n / 100) * 100 + '+';
  return n + '+';
}

type StatKey =
  | 'verified'
  | 'processed'
  | 'winRate'
  | 'roi'
  | 'active'
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
  processed: {
    labelKey: 'home.stats_picks',
    icon: '📊',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/40',
    iconBg: 'bg-blue-500/25 text-blue-300',
  },
  winRate: {
    labelKey: 'tipster.win_rate',
    icon: '📈',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/40',
    iconBg: 'bg-amber-500/25 text-amber-300',
  },
  roi: {
    labelKey: 'tipster.roi',
    icon: '💰',
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/40',
    iconBg: 'bg-rose-500/25 text-rose-300',
  },
  active: {
    labelKey: 'home.stats_picks',
    icon: '⚡',
    bg: 'bg-violet-500/15',
    border: 'border-violet-500/40',
    iconBg: 'bg-violet-500/25 text-violet-300',
  },
  paidOut: {
    labelKey: 'dashboard.balance',
    icon: '🏆',
    bg: 'bg-cyan-500/15',
    border: 'border-cyan-500/40',
    iconBg: 'bg-cyan-500/25 text-cyan-300',
  },
};

export function HomeHero() {
  const t = useT();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [topTipster, setTopTipster] = useState<LeaderboardEntry | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const fetchStats = () => {
    Promise.all([
      fetch(getApiUrl() + '/accumulators/stats/public', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
      fetch(getApiUrl() + '/leaderboard?period=all_time&limit=1', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : { leaderboard: [] })),
    ]).then(([data, leaderData]) => {
      if (data) setStats(data);
      const entries = (leaderData?.leaderboard || []) as LeaderboardEntry[];
      if (entries.length > 0) setTopTipster(entries[0]);
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
  const bestWinRate = topTipster?.win_rate != null ? Math.round(Number(topTipster.win_rate) * 10) / 10 : s.winRate;
  const bestRoi = topTipster?.roi != null ? Math.round(Number(topTipster.roi) * 100) / 100 : 0;
  const paidOutFormatted = s.totalPaidOut >= 1000 ? 'GHS ' + (s.totalPaidOut / 1000).toFixed(1) + 'K+' : 'GHS ' + s.totalPaidOut + '+';

  const statItems: { key: StatKey; value: string }[] = [
    { key: 'verified', value: formatNumber(s.verifiedTipsters) },
    { key: 'processed', value: formatNumber(s.totalPicks) },
    { key: 'winRate', value: bestWinRate + '%' },
    { key: 'roi', value: bestRoi + '%' },
    { key: 'active', value: formatNumber(s.activePicks) },
    { key: 'paidOut', value: paidOutFormatted },
  ];

  return (
    <section className="relative overflow-hidden min-h-[640px]">
      {/* Brighter base gradient - appealing dark with teal/emerald warmth */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-800 via-teal-900/90 to-slate-800"
        aria-hidden="true"
      />
      {/* Animated gradient mesh - livelier emerald glow */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(16,185,129,0.35),rgba(5,150,105,0.12),transparent_60%)] animate-gradient-shift"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_80%_30%,rgba(16,185,129,0.2),transparent_55%)]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_15%_70%,rgba(5,150,105,0.15),transparent_55%)]"
        aria-hidden="true"
      />
      {/* Animated floating orbs */}
      <div
        className="absolute top-[15%] left-[20%] w-80 h-80 bg-emerald-400/20 rounded-full blur-3xl animate-orb-drift"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-[20%] right-[25%] w-72 h-72 bg-emerald-500/25 rounded-full blur-3xl animate-float-slow"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-teal-400/15 rounded-full blur-3xl animate-float-slower"
        aria-hidden="true"
      />
      {/* Subtle grid overlay for depth */}
      <div
        className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black_20%,transparent_100%)]"
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-28">
        <div className="text-center max-w-3xl mx-auto mb-14 md:mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-5 animate-fade-in-up">
            {t('home.hero_title')}
          </h1>
          <p className="text-lg md:text-xl text-slate-300 mb-6 leading-relaxed max-w-2xl mx-auto animate-fade-in-up animate-delay-100">
            {t('home.hero_subtitle')}
          </p>

          {/* Sport pills row */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8 animate-fade-in-up animate-delay-150">
            {[
              { icon: '⚽', labelKey: 'nav.football' },
              { icon: '🏀', labelKey: 'nav.basketball' },
              { icon: '🏉', labelKey: 'nav.rugby' },
              { icon: '🥊', labelKey: 'nav.mma' },
              { icon: '🏐', labelKey: 'nav.volleyball' },
              { icon: '🏒', labelKey: 'nav.hockey' },
              { icon: '🏈', labelKey: 'nav.american_football' },
              { icon: '🎾', labelKey: 'nav.tennis' },
            ].map(({ icon, labelKey }) => (
              <span key={labelKey} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/30 border border-emerald-400/50 text-emerald-200 text-sm font-semibold backdrop-blur-sm">
                {icon} {t(labelKey)}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-4 justify-center animate-fade-in-up animate-delay-200">
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
        </div>

        {/* Compact KPI Dashboard - 6 cards with distinct colors */}
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
