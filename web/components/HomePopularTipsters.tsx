'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TipsterCard, type TipsterCardData } from '@/components/TipsterCard';
import { getApiUrl } from '@/lib/site-config';

function mapLeaderboardToTipsterCard(entry: Record<string, unknown>, index: number): TipsterCardData {
  const rank = (entry.rank ?? entry.leaderboard_rank ?? index + 1) as number;
  const totalPredictions = (entry.total_predictions ?? entry.monthly_predictions ?? 0) as number;
  const totalWins = (entry.total_wins ?? entry.monthly_wins ?? 0) as number;
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
    total_losses: totalPredictions - totalWins,
    leaderboard_rank: rank,
    follower_count: 0,
    is_following: false,
  };
}

export function HomePopularTipsters() {
  const [tipsters, setTipsters] = useState<TipsterCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(getApiUrl() + '/leaderboard?period=all_time&limit=6')
      .then((r) => (r.ok ? r.json() : { leaderboard: [] }))
      .then((data) => {
        const entries = (data.leaderboard || []) as Record<string, unknown>[];
        setTipsters(entries.map((e, i) => mapLeaderboardToTipsterCard(e, i)));
      })
      .catch(() => setTipsters([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-12 md:py-16 bg-[var(--bg)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[var(--text)]">Most Popular Tipsters</h2>
          <Link href="/tipsters" className="text-sm font-medium text-[var(--primary)] hover:underline">
            See all →
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-2xl bg-[var(--card)] animate-pulse" />
            ))}
          </div>
        ) : tipsters.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tipsters.slice(0, 6).map((tipster) => (
              <TipsterCard key={tipster.username || tipster.id} tipster={tipster} />
            ))}
          </div>
        ) : (
          <p className="text-[var(--text-muted)] text-center py-8">No tipsters yet. Check back soon.</p>
        )}
      </div>
    </section>
  );
}
