'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { TipsterCard, type TipsterCardData } from '@/components/TipsterCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { PageHeader } from '@/components/PageHeader';
import { AdSlot } from '@/components/AdSlot';
import { useToast } from '@/hooks/useToast';
import { ErrorToast } from '@/components/ErrorToast';
import { SuccessToast } from '@/components/SuccessToast';
import { useT } from '@/context/LanguageContext';
import { getApiUrl } from '@/lib/site-config';
import { AUTH_STORAGE_SYNC } from '@/lib/auth-storage-sync';

type Period = 'all_time' | 'monthly' | 'weekly';
type SportFilter = 'all' | 'football' | 'basketball' | 'rugby' | 'mma' | 'volleyball' | 'hockey' | 'american_football';

function mapLeaderboardToTipsterCard(entry: Record<string, unknown>, index: number): TipsterCardData {
  const rank = (entry.rank ?? entry.leaderboard_rank ?? index + 1) as number;
  const totalPredictions = (entry.total_predictions ?? entry.monthly_predictions ?? 0) as number;
  const totalWins = (entry.total_wins ?? entry.monthly_wins ?? 0) as number;
  const totalLosses =
    entry.total_losses != null ? (entry.total_losses as number) : Math.max(0, totalPredictions - totalWins);
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
    vip_package_id: (entry.vip_package_id as number | null | undefined) ?? null,
  };
}

export default function TipstersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  const [tipsters, setTipsters] = useState<TipsterCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<Period>('all_time');
  const [sportFilter, setSportFilter] = useState<SportFilter>('all');
  const [sortBy, setSortBy] = useState<'roi' | 'win_rate' | 'total_profit' | 'follower_count'>('roi');
  const [followLoading, setFollowLoading] = useState<number | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const { showError, showSuccess, clearError, clearSuccess, error: toastError, success: toastSuccess } = useToast();

  useEffect(() => {
    const sync = () => setIsSignedIn(!!localStorage.getItem('token'));
    sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === null) sync();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(AUTH_STORAGE_SYNC, sync);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(AUTH_STORAGE_SYNC, sync);
    };
  }, [pathname]);

  const fetchTipsters = useCallback(
    (searchTerm?: string, sort?: string, periodVal?: Period, sport?: SportFilter) => {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const p = periodVal ?? period;
      const s = sport ?? sportFilter;
      if (p === 'monthly' || p === 'weekly') {
        const params = new URLSearchParams({ period: p, limit: '50' });
        if (s && s !== 'all') params.set('sport', s);
        fetch(`${getApiUrl()}/leaderboard?${params}`, { headers })
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
        if (s && s !== 'all') params.set('sport', s);
        fetch(`${getApiUrl()}/tipsters?${params}`, { headers })
          .then((r) => (r.ok ? r.json() : { tipsters: [] }))
          .then((data) => setTipsters(data.tipsters || []))
          .catch(() => setTipsters([]))
          .finally(() => setLoading(false));
      }
    },
    [sortBy, period, sportFilter]
  );

  useEffect(() => {
    if (period === 'monthly' || period === 'weekly') {
      fetchTipsters(undefined, undefined, period, sportFilter);
      return;
    }
    const t = setTimeout(() => fetchTipsters(search, undefined, period, sportFilter), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, period, sportFilter, fetchTipsters]);

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
        try { (await import('@/lib/analytics')).trackEvent(isFollowing ? 'unfollowed_tipster' : 'followed_tipster', { username: tipster.username }, token); } catch { /* noop */ }
        showSuccess(isFollowing ? t('tipster.toast_unfollowed') : t('tipster.toast_following'));
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
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      {toastError ? <ErrorToast error={toastError} onClose={clearError} /> : null}
      {toastSuccess ? <SuccessToast message={toastSuccess} onClose={clearSuccess} /> : null}
      <UnifiedHeader />
      <main className="section-ux-page w-full min-w-0">
        <PageHeader
          label={t('nav.tipsters')}
          title={t('seo.tipsters_title').split(' | ')[0]}
          tagline={t('seo.tipsters_desc')}
        />
        {/* Full-width ad */}
        <div className="mb-6 w-full">
          <AdSlot zoneSlug="tipsters-full" fullWidth className="w-full max-w-3xl mx-auto" />
        </div>
        {/* Contextual smart buttons — no hamburger needed */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 mb-6 min-w-0 max-w-full">
          <Link
            href="/leaderboard"
            className="inline-flex justify-center items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm font-medium text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors w-full sm:w-auto"
          >
            <span aria-hidden>🏆</span> {t('nav.leaderboard')}
          </Link>
          <Link
            href="/create-pick"
            className="inline-flex justify-center items-center gap-2 px-4 py-2 rounded-xl border border-[var(--primary)]/50 bg-[var(--primary)]/10 text-sm font-medium text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors w-full sm:w-auto"
          >
            <span aria-hidden>🎯</span> {t('nav.create_coupon')}
          </Link>
          {isSignedIn && (
            <Link
              href="/dashboard/subscription-packages"
              className="inline-flex justify-center items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm font-medium text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors w-full sm:w-auto"
            >
              <span aria-hidden>📦</span> {t('tipster.subscription_packages')}
            </Link>
          )}
        </div>
        <div className="mb-8 w-full min-w-0 max-w-full">
          {/* Sport filter pills */}
          <div className="flex flex-nowrap sm:flex-wrap gap-2 mb-3 w-full min-w-0 overflow-x-auto overscroll-x-contain pb-1 scrollbar-hide -mx-1 px-1 touch-pan-x [-webkit-overflow-scrolling:touch] sm:mx-0 sm:px-0 sm:pb-0 sm:overflow-visible">
            {([
              { key: 'all' as SportFilter,               icon: '🌍', labelKey: 'marketplace.filter_all_sports' },
              { key: 'football' as SportFilter,          icon: '⚽', labelKey: 'nav.football' },
              { key: 'basketball' as SportFilter,        icon: '🏀', labelKey: 'nav.basketball' },
              { key: 'rugby' as SportFilter,             icon: '🏉', labelKey: 'nav.rugby' },
              { key: 'mma' as SportFilter,               icon: '🥊', labelKey: 'nav.mma' },
              { key: 'volleyball' as SportFilter,        icon: '🏐', labelKey: 'nav.volleyball' },
              { key: 'hockey' as SportFilter,            icon: '🏒', labelKey: 'nav.hockey' },
              { key: 'american_football' as SportFilter, icon: '🏈', labelKey: 'nav.american_football' },
            ]).map((sp) => (
              <button
                type="button"
                key={sp.key}
                onClick={() => setSportFilter(sp.key)}
                className={`inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  sportFilter === sp.key
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm'
                    : 'bg-[var(--card)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
                }`}
              >
                <span>{sp.icon}</span>
                <span>{t(sp.labelKey)}</span>
              </button>
            ))}
          </div>

          {/* Period tabs */}
          <div className="flex flex-nowrap sm:flex-wrap gap-2 mb-4 w-full min-w-0 overflow-x-auto overscroll-x-contain pb-1 scrollbar-hide -mx-1 px-1 touch-pan-x [-webkit-overflow-scrolling:touch] sm:mx-0 sm:px-0 sm:pb-0 sm:overflow-visible">
            {([
              { key: 'all_time' as Period,  label: t('tipster.period_alltime') },
              { key: 'monthly'  as Period,  label: t('tipster.period_monthly') },
              { key: 'weekly'   as Period,  label: t('tipster.period_weekly') },
            ]).map(({ key: p, label }) => (
              <button
                type="button"
                key={p}
                onClick={() => setPeriod(p)}
                className={`shrink-0 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                  period === p
                    ? 'bg-[var(--primary)] text-white shadow-md'
                    : 'bg-[var(--card)] text-[var(--text-muted)] hover:bg-[var(--border)] border border-[var(--border)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {period === 'all_time' && (
            <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center min-w-0 max-w-full">
              <input
                type="search"
                placeholder={t('tipster.search_placeholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full min-w-0 max-w-md px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                aria-label={t('common.search')}
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="w-full min-w-0 sm:w-auto sm:min-w-[200px] px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                aria-label={t('common.filter')}
              >
                <option value="roi">{t('tipster.sort_roi')}</option>
                <option value="win_rate">{t('tipster.sort_win_rate')}</option>
                <option value="total_profit">{t('tipster.sort_profit')}</option>
                <option value="follower_count">{t('tipster.sort_followers')}</option>
              </select>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 min-w-0">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <LoadingSkeleton key={i} count={1} className="h-48 rounded-2xl" />
            ))}
          </div>
        ) : tipsters.length === 0 ? (
          <EmptyState
            title={t('tipster.no_tipsters')}
            description={t('common.no_results')}
            actionLabel={t('error.go_home')}
            actionHref="/"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 min-w-0">
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
    </div>
  );
}
