'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TipsterCard, type TipsterCardData } from '@/components/TipsterCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { PageHeader } from '@/components/PageHeader';
import { AppFooter } from '@/components/AppFooter';
import { useToast } from '@/hooks/useToast';
import { ErrorToast } from '@/components/ErrorToast';
import { SuccessToast } from '@/components/SuccessToast';
import { getApiUrl } from '@/lib/site-config';

type Period = 'all_time' | 'monthly' | 'weekly';

function mapLeaderboardToTipsterCard(entry: Record<string, unknown>, index: number): TipsterCardData {
  const rank = (entry.rank ?? entry.leaderboard_rank ?? index + 1) as number;
  const totalPredictions = (entry.total_predictions ?? entry.monthly_predictions ?? 0) as number;
  const totalWins = (entry.total_wins ?? entry.monthly_wins ?? 0) as number;
  const totalLosses = totalPredictions - totalWins;
  const roi = (entry.roi ?? 0) as number;
  const winRate = totalPredictions > 0 ? (totalWins / totalPredictions) * 100 : 0;
  return {
    id: entry.id as number,
    username: entry.username as string,
    display_name: entry.display_name as string,
    avatar_url: (entry.avatar_url as string | null) ?? null,
    bio: null,
    roi,
    win_rate: (entry.win_rate as number) ?? winRate,
    current_streak: 0,
    total_predictions: totalPredictions,
    total_wins: totalWins,
    total_losses: totalLosses,
    leaderboard_rank: rank,
    follower_count: 0,
    is_following: false,
  };
}

export default function TipstersPage() {
  const router = useRouter();
  const [tipsters, setTipsters] = useState<TipsterCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<Period>('all_time');
  const [sortBy, setSortBy] = useState<'roi' | 'win_rate' | 'total_profit' | 'follower_count'>('roi');
  const [followLoading, setFollowLoading] = useState<number | null>(null);
  const { showError, showSuccess, clearError, clearSuccess, error: toastError, success: toastSuccess } = useToast();

  const fetchTipsters = useCallback(
    (searchTerm?: string, sort?: string, periodVal?: Period) => {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const p = periodVal ?? period;
      if (p === 'monthly' || p === 'weekly') {
        fetch(`${getApiUrl()}/leaderboard?period=${p}&limit=50`, { headers })
          .then((r) => (r.ok ? r.json() : { leaderboard: [] }))
          .then((data) => {
            const entries = (data.leaderboard || []) as Record<string, unknown>[];
            setTipsters(entries.map((e, i) => mapLeaderboardToTipsterCard(e, i)));
          })
          .catch(() => setTipsters([]))
          .finally(() => setLoading(false));
      } else {
        const params = new URLSearchParams({ limit: '50', sort_by: sort || sortBy, order: 'desc' });
        if (searchTerm?.trim()) params.set('search', searchTerm.trim());
        fetch(`${getApiUrl()}/tipsters?${params}`, { headers })
          .then((r) => (r.ok ? r.json() : { tipsters: [] }))
          .then((data) => setTipsters(data.tipsters || []))
          .catch(() => setTipsters([]))
          .finally(() => setLoading(false));
      }
    },
    [sortBy, period]
  );

  useEffect(() => {
    if (period === 'monthly' || period === 'weekly') {
      fetchTipsters(undefined, undefined, period);
      return;
    }
    const t = setTimeout(() => fetchTipsters(search, undefined, period), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, period, fetchTipsters]);

  const handleFollow = async (tipster: TipsterCardData) => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push(`/login?redirect=/tipsters`);
      return;
    }
    const isFollowing = tipster.is_following;
    setFollowLoading(tipster.id);
    setTipsters((prev) =>
      prev.map((t) =>
        t.id === tipster.id ? { ...t, is_following: !isFollowing, follower_count: Math.max(0, (t.follower_count ?? 0) + (isFollowing ? -1 : 1)) } : t
      )
    );
    try {
      const res = await fetch(`${getApiUrl()}/tipsters/${encodeURIComponent(tipster.username)}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showSuccess(isFollowing ? 'Unfollowed' : 'Following! You\'ll see their picks in your feed.');
      } else {
        setTipsters((prev) =>
          prev.map((t) => (t.id === tipster.id ? { ...t, is_following: isFollowing, follower_count: tipster.follower_count ?? 0 } : t))
        );
        const err = await res.json().catch(() => ({}));
        showError(new Error(err.message || 'Failed to update follow'));
      }
    } catch (e) {
      setTipsters((prev) =>
        prev.map((t) => (t.id === tipster.id ? { ...t, is_following: isFollowing, follower_count: tipster.follower_count ?? 0 } : t))
      );
      showError(e instanceof Error ? e : new Error('Failed to update follow'));
    } finally {
      setFollowLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {toastError ? <ErrorToast error={toastError} onClose={clearError} /> : null}
      {toastSuccess ? <SuccessToast message={toastSuccess} onClose={clearSuccess} /> : null}
      <UnifiedHeader />
      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <PageHeader
          label="Tipsters"
          title="Tipsters"
          tagline="Browse verified tipsters. Rankings shown on each card. Follow your favorites and track their performance."
        />
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 mb-4">
            {(['all_time', 'monthly', 'weekly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                  period === p
                    ? 'bg-[var(--primary)] text-white shadow-md'
                    : 'bg-[var(--card)] text-[var(--text-muted)] hover:bg-[var(--border)] border border-[var(--border)]'
                }`}
              >
                {p === 'all_time' ? 'All Time' : p === 'monthly' ? 'This Month' : 'This Week'}
              </button>
            ))}
          </div>
          {period === 'all_time' && (
            <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center">
              <input
                type="search"
                placeholder="Search tipsters by name or bio..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full max-w-md px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                aria-label="Search tipsters"
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                aria-label="Sort tipsters"
              >
                <option value="roi">Sort by ROI</option>
                <option value="win_rate">Sort by Win Rate</option>
                <option value="total_profit">Sort by Profit</option>
                <option value="follower_count">Sort by Followers</option>
              </select>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <LoadingSkeleton key={i} count={1} className="h-48 rounded-2xl" />
            ))}
          </div>
        ) : tipsters.length === 0 ? (
          <EmptyState
            title="No tipsters yet"
            description="Tipsters will appear here soon. Check back later."
            actionLabel="Back to Home"
            actionHref="/"
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tipsters.map((t) => (
              <TipsterCard
                key={t.id}
                tipster={t}
                onFollow={() => handleFollow(t)}
                followLoading={followLoading === t.id}
              />
            ))}
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
