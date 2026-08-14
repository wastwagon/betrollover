'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TipsterCard, type TipsterCardData } from '@/components/TipsterCard';
import { getApiUrl } from '@/lib/site-config';
import { useT } from '@/context/LanguageContext';
import { hasPrimaryLeaderboardSample } from '@/lib/leaderboard-sample';

function mapLeaderboardToTipsterCard(entry: Record<string, unknown>, index: number): TipsterCardData {
  const rank = (entry.rank ?? entry.leaderboard_rank ?? index + 1) as number;
  const totalPredictions = (entry.total_predictions ?? entry.monthly_predictions ?? 0) as number;
  const totalWins = (entry.total_wins ?? entry.monthly_wins ?? 0) as number;
  const totalLosses =
    entry.total_losses != null ? (entry.total_losses as number) : Math.max(0, totalPredictions - totalWins);
  const roi = (entry.roi ?? 0) as number;
  const winRate = totalPredictions > 0 ? (totalWins / totalPredictions) * 100 : 0;
  return {
    id: (entry.id ?? 0) as number,
    username: (entry.username ?? '') as string,
    display_name: (entry.display_name ?? '') as string,
    avatar_url: (entry.avatar_url as string | null) ?? null,
    bio: null,
    roi,
    win_rate: (entry.win_rate as number) ?? winRate,
    current_streak: 0,
    total_predictions: totalPredictions,
    total_wins: totalWins,
    total_losses: totalLosses,
    leaderboard_rank: rank,
    follower_count: (entry.follower_count as number | undefined) ?? 0,
    is_following: false,
    is_ai: !!(entry.is_ai as boolean | undefined),
    avg_rating: (entry.avg_rating as number | null | undefined) ?? null,
    review_count: (entry.review_count as number | null | undefined) ?? null,
    avg_odds: (entry.avg_odds as number | null | undefined) ?? null,
  };
}

export function HomePopularTipsters({
  initialLeaderboard = [],
}: {
  initialLeaderboard?: Record<string, unknown>[];
}) {
  const t = useT();
  const seeded = initialLeaderboard
    .filter(hasPrimaryLeaderboardSample)
    .map((e, i) => mapLeaderboardToTipsterCard(e, i));
  const [tipsters, setTipsters] = useState<TipsterCardData[]>(seeded);
  const [loading, setLoading] = useState(seeded.length === 0);

  useEffect(() => {
    fetch(getApiUrl() + '/leaderboard?period=all_time&limit=24')
      .then((r) => (r.ok ? r.json() : { leaderboard: [] }))
      .then((data) => {
        const entries = ((data.leaderboard || []) as Record<string, unknown>[])
          .filter(hasPrimaryLeaderboardSample)
          .slice(0, 8);
        setTipsters(entries.map((e, i) => mapLeaderboardToTipsterCard(e, i)));
      })
      .catch(() => setTipsters([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="relative pt-6 pb-10 sm:py-12 md:py-16 w-full min-w-0 max-w-full overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(16,185,129,0.08),transparent_60%)]"
        aria-hidden
      />
      <div className="section-ux-gutter-wide relative w-full min-w-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-5 sm:mb-7">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700/80 dark:text-emerald-400/90 mb-1">
              {t('nav.tipsters')}
            </p>
            <h2 className="text-xl font-bold text-[var(--text)] sm:text-2xl md:text-[28px] tracking-tight min-w-0">
              {t('home.featured_tipsters')}
            </h2>
          </div>
          <Link
            href="/tipsters"
            className="touch-target inline-flex items-center rounded-full border border-emerald-600/20 bg-emerald-500/10 px-3.5 py-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/15 transition-colors shrink-0 w-fit"
          >
            {t('home.see_tipsters')} →
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 min-w-0">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="h-28 sm:h-32 rounded-xl bg-[var(--card)] border border-[var(--separator)] animate-pulse"
              />
            ))}
          </div>
        ) : tipsters.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 min-w-0">
            {tipsters.slice(0, 8).map((tipster) => (
              <TipsterCard
                key={tipster.username || tipster.id}
                tipster={tipster}
                variant="premium"
              />
            ))}
          </div>
        ) : (
          <p className="text-[var(--text-muted)] text-center py-8">{t('common.no_results')}</p>
        )}
      </div>
    </section>
  );
}
