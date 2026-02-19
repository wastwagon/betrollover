'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TipsterCard, type TipsterCardData } from '@/components/TipsterCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { SiteHeader } from '@/components/SiteHeader';
import { AppFooter } from '@/components/AppFooter';
import { useToast } from '@/hooks/useToast';
import { ErrorToast } from '@/components/ErrorToast';
import { SuccessToast } from '@/components/SuccessToast';
import { getApiUrl } from '@/lib/site-config';

export default function TipstersPage() {
  const router = useRouter();
  const [tipsters, setTipsters] = useState<TipsterCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'roi' | 'win_rate' | 'total_profit' | 'follower_count'>('roi');
  const [followLoading, setFollowLoading] = useState<number | null>(null);
  const { showError, showSuccess, clearError, clearSuccess, error: toastError, success: toastSuccess } = useToast();

  const fetchTipsters = useCallback((searchTerm?: string, sort?: string) => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const params = new URLSearchParams({ limit: '50', sort_by: sort || sortBy, order: 'desc' });
    if (searchTerm?.trim()) params.set('search', searchTerm.trim());
    fetch(`${getApiUrl()}/tipsters?${params}`, { headers })
      .then((r) => (r.ok ? r.json() : { tipsters: [] }))
      .then((data) => setTipsters(data.tipsters || []))
      .catch(() => setTipsters([]))
      .finally(() => setLoading(false));
  }, [sortBy]);

  useEffect(() => {
    const t = setTimeout(() => fetchTipsters(search), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, sortBy, fetchTipsters]);

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
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text)]">Tipsters</h1>
          <p className="mt-2 text-[var(--text-muted)]">
            Browse verified tipsters. Follow your favorites and track their performance.
          </p>
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
