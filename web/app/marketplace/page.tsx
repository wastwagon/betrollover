'use client';

import { useEffect, useState, useMemo } from 'react';
import { useT } from '@/context/LanguageContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { PageHeader } from '@/components/PageHeader';
import { AdSlot } from '@/components/AdSlot';
import { PickCard } from '@/components/PickCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/hooks/useToast';
import { formatError } from '@/utils/errorMessages';
import { ErrorToast } from '@/components/ErrorToast';
import { SuccessToast } from '@/components/SuccessToast';
import { getApiUrl } from '@/lib/site-config';

const API_URL = getApiUrl();

type PriceFilter = 'all' | 'free' | 'paid';
type SortBy = 'newest' | 'price-low' | 'price-high' | 'tipster-rank' | 'following-only';

interface Pick {
  id: number;
  matchDescription?: string;
  prediction?: string;
  odds?: number;
  matchDate?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  fixtureStatus?: string | null;
  status?: string;
}

interface Tipster {
  id: number;
  displayName: string;
  username: string;
  winRate: number;
  totalPicks: number;
  wonPicks: number;
  lostPicks: number;
  rank: number;
  avatarUrl?: string | null;
}

interface Accumulator {
  id: number;
  title: string;
  sport?: string;
  totalOdds: number;
  totalPicks: number;
  price: number;
  purchaseCount?: number;
  reactionCount?: number;
  hasReacted?: boolean;
  picks: Pick[];
  tipster?: Tipster | null;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
  result?: string;
  avgRating?: number | null;
  reviewCount?: number | null;
}

interface User {
  id: number;
  displayName: string;
  email: string;
}

export default function MarketplacePage() {
  const router = useRouter();
  const t = useT();
  const [picks, setPicks] = useState<Accumulator[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [purchasedIds, setPurchasedIds] = useState<Set<number>>(new Set());
  const [unveilCouponId, setUnveilCouponId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [sportFilter, setSportFilter] = useState<string>(''); // '' = all, 'football', 'basketball'
  const [followedTipsterUsernames, setFollowedTipsterUsernames] = useState<Set<string>>(new Set());
  const [followLoading, setFollowLoading] = useState<string | null>(null);
  const { showError, showSuccess, clearError, clearSuccess, error: toastError, success: toastSuccess } = useToast();

  const handleFollow = async (username: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login?redirect=/marketplace');
      return;
    }
    const isFollowing = followedTipsterUsernames.has(username);
    setFollowLoading(username);
    setFollowedTipsterUsernames((prev) => {
      const next = new Set(prev);
      if (isFollowing) next.delete(username);
      else next.add(username);
      return next;
    });
    try {
      const res = await fetch(`${API_URL}/tipsters/${encodeURIComponent(username)}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showSuccess(isFollowing ? t('tipster.toast_unfollowed') : t('tipster.toast_following'));
      } else {
        setFollowedTipsterUsernames((prev) => {
          const next = new Set(prev);
          if (isFollowing) next.add(username);
          else next.delete(username);
          return next;
        });
        const err = await res.json().catch(() => ({}));
        showError(new Error(err.message || 'Failed to update follow'));
      }
    } catch (e) {
      setFollowedTipsterUsernames((prev) => {
        const next = new Set(prev);
        if (isFollowing) next.add(username);
        else next.delete(username);
        return next;
      });
      showError(e instanceof Error ? e : new Error('Failed to update follow'));
    } finally {
      setFollowLoading(null);
    }
  };

  const filteredAndSortedPicks = useMemo(() => {
    let list = [...picks]; // API already filters by sport when sportFilter is set
    if (priceFilter === 'free') list = list.filter((p) => p.price === 0);
    if (priceFilter === 'paid') list = list.filter((p) => p.price > 0);
    if (sortBy === 'following-only' && followedTipsterUsernames.size > 0) {
      list = list.filter((p) => p.tipster?.username && followedTipsterUsernames.has(p.tipster.username));
    }
    if (sortBy === 'newest' || sortBy === 'following-only') {
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else if (sortBy === 'price-low') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'tipster-rank') {
      list.sort((a, b) => (a.tipster?.rank ?? 999) - (b.tipster?.rank ?? 999));
    }
    return list;
  }, [picks, priceFilter, sortBy, followedTipsterUsernames]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Fetch marketplace picks, wallet balance, user info, purchased picks, and followed tipsters
    const sportParam = sportFilter ? `&sport=${encodeURIComponent(sportFilter)}` : '';
    Promise.all([
      fetch(`${API_URL}/accumulators/marketplace?limit=24${sportParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => (r.ok ? r.json() : { items: [], total: 0, hasMore: false })),
      fetch(`${API_URL}/wallet/balance`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => (r.ok ? r.json() : null)),
      fetch(`${API_URL}/accumulators/purchased`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => (r.ok ? r.json() : null)),
      fetch(`${API_URL}/tipsters/me/following`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([marketplaceData, walletData, purchasedData, userData, followingData]) => {
        const items = marketplaceData?.items ?? (Array.isArray(marketplaceData) ? marketplaceData : []);
        const totalCount = marketplaceData?.total ?? items.length;
        const hasMoreFlag = marketplaceData?.hasMore ?? false;
        setPicks(items);
        setTotal(totalCount);
        setHasMore(hasMoreFlag);
        if (walletData) setWalletBalance(Number(walletData.balance));
        if (userData) setCurrentUserId(userData.id);
        if (Array.isArray(purchasedData)) {
          const purchasedSet = new Set(purchasedData.map((p: any) => p.accumulatorId || p.pick?.id));
          setPurchasedIds(purchasedSet);
        }
        if (Array.isArray(followingData)) {
          setFollowedTipsterUsernames(new Set(followingData.map((t: { username: string }) => t.username)));
        }
      })
      .catch((err) => {
        setPicks([]);
        setTotal(0);
        setHasMore(false);
        showError(err);
      })
      .finally(() => setLoading(false));
  }, [router, sportFilter]);

  const recordView = (id: number) => {
    fetch(`${API_URL}/accumulators/${id}/view`, { method: 'POST' }).catch(() => {});
  };

  const loadMore = async () => {
    const token = localStorage.getItem('token');
    if (!token || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const sportParam = sportFilter ? `&sport=${encodeURIComponent(sportFilter)}` : '';
      const res = await fetch(
        `${API_URL}/accumulators/marketplace?limit=24&offset=${picks.length}${sportParam}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json().catch(() => ({}));
      const items = data?.items ?? [];
      setPicks((prev) => [...prev, ...items]);
      setHasMore(data?.hasMore ?? false);
    } catch (e) {
      showError(e instanceof Error ? e : new Error('Failed to load more'));
    } finally {
      setLoadingMore(false);
    }
  };

  const purchase = async (id: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const coupon = picks.find(p => p.id === id);
    if (!coupon) return;

    // Check wallet balance for paid coupons
    if (coupon.price > 0 && (walletBalance === null || walletBalance < coupon.price)) {
      showError(new Error(`Insufficient funds. You need GHS ${coupon.price.toFixed(2)} but only have GHS ${walletBalance?.toFixed(2) || '0.00'}.`));
      return;
    }

    setPurchasing(id);
    try {
      const res = await fetch(`${API_URL}/accumulators/${id}/purchase`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const purchasedTicket = await res.json();
        showSuccess(t('tipster.toast_coupon_purchased'));
        // Mark as purchased
        setPurchasedIds(prev => new Set([...Array.from(prev), id]));
        // Refresh wallet balance
        const walletRes = await fetch(`${API_URL}/wallet/balance`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (walletRes.ok) {
          const walletData = await walletRes.json();
          setWalletBalance(Number(walletData.balance));
        }
        // Update pick data
        setPicks(prev => prev.map(p =>
          p.id === id ? { ...p, purchased: true, purchasedTicket } : p
        ));
        // Trigger unveil modal
        setUnveilCouponId(id);
      } else {
        const err = await res.json().catch(() => ({}));
        const errorMessage = err.message || 'Purchase failed';
        showError(new Error(errorMessage));
      }
    } catch (error: any) {
      showError(error);
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <DashboardShell>
      {toastError ? <ErrorToast error={toastError} onClose={clearError} /> : null}
      {toastSuccess ? <SuccessToast message={toastSuccess} onClose={clearSuccess} /> : null}
      <div className="dashboard-bg dashboard-pattern min-h-[calc(100vh-8rem)]">
        <div className="w-full px-4 sm:px-5 md:px-6 lg:px-8 py-5 md:py-6 pb-24">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-0">
            <PageHeader
              label={t('nav.marketplace')}
              title={t('marketplace.title')}
              tagline={t('marketplace.subtitle')}
            />
            <Link
              href="/coupons/archive"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors self-start sm:self-auto flex-shrink-0"
            >
              📦 Settled Archive →
            </Link>
          </div>

          {/* Full-width ad */}
          <div className="mb-4">
            <AdSlot zoneSlug="marketplace-full" fullWidth className="w-full" />
          </div>

          {/* Sport tabs — scrollable on mobile */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {([
              { key: '',                label: `🌍 ${t('marketplace.filter_all_sports')}` },
              { key: 'football',        label: `⚽ ${t('nav.football')}` },
              { key: 'basketball',      label: `🏀 ${t('nav.basketball')}` },
              { key: 'rugby',           label: '🏉 Rugby' },
              { key: 'mma',             label: '🥊 MMA' },
              { key: 'volleyball',      label: '🏐 Volleyball' },
              { key: 'hockey',          label: '🏒 Hockey' },
              { key: 'american_football', label: '🏈 Amer. Football' },
              { key: 'tennis',          label: '🎾 Tennis' },
              { key: 'multi',           label: '🌐 Multi-Sport' },
            ] as { key: string; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSportFilter(key)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  sportFilter === key
                    ? 'bg-[var(--primary)] text-white shadow-md'
                    : 'bg-[var(--card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Filters */}
          {!loading && picks.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-[var(--text)]">Price</label>
                <select
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value as PriceFilter)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary)] min-w-[120px]"
                >
                  <option value="all">All</option>
                  <option value="free">Free only</option>
                  <option value="paid">Paid only</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-[var(--text)]">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary)] min-w-[140px]"
                >
                  <option value="newest">Newest first</option>
                  {followedTipsterUsernames.size > 0 && (
                    <option value="following-only">Following only</option>
                  )}
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="tipster-rank">Tipster rank</option>
                </select>
              </div>
              {(priceFilter !== 'all' || sortBy !== 'newest') && (
                <button
                  onClick={() => {
                    setPriceFilter('all');
                    setSortBy('newest');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {loading && (
            <LoadingSkeleton count={8} variant="cards" />
          )}
          {!loading && picks.length === 0 && (
            <div className="card-gradient rounded-2xl">
              <EmptyState
                title={t('marketplace.no_picks')}
                description={t('marketplace.no_picks_sub')}
                actionLabel={t('nav.create_coupon')}
                actionHref="/create-pick"
                icon="🛒"
              />
            </div>
          )}
          {!loading && picks.length > 0 && filteredAndSortedPicks.length === 0 && (
            <div className="card-gradient rounded-2xl p-6">
              <EmptyState
                title={t('common.no_results')}
                description={t('marketplace.no_picks_sub')}
                actionLabel={t('common.clear')}
                onActionClick={() => {
                  setPriceFilter('all');
                  setSortBy('newest');
                }}
                icon="🔍"
              />
            </div>
          )}
          {!loading && filteredAndSortedPicks.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-8">
              {filteredAndSortedPicks.map((a) => {
                const isPurchased = purchasedIds.has(a.id);
                const canPurchase = a.price === 0 || (walletBalance !== null && walletBalance >= a.price);

                return (
                  <PickCard
                    key={a.id}
                    id={a.id}
                    title={a.title}
                    totalPicks={a.totalPicks}
                    totalOdds={a.totalOdds}
                    price={a.price}
                    purchaseCount={a.purchaseCount}
                    avgRating={a.avgRating}
                    reviewCount={a.reviewCount}
                    status={a.status}
                    result={a.result}
                    picks={a.picks || []}
                    tipster={a.tipster}
                    isPurchased={isPurchased}
                    canPurchase={canPurchase}
                    walletBalance={walletBalance}
                    onPurchase={() => purchase(a.id)}
                    purchasing={purchasing === a.id}
                    showUnveil={unveilCouponId === a.id}
                    onUnveilClose={() => setUnveilCouponId(null)}
                    onView={() => recordView(a.id)}
                    createdAt={a.createdAt}
                    isFollowing={a.tipster?.username ? followedTipsterUsernames.has(a.tipster.username) : false}
                    onFollow={a.tipster?.username ? () => handleFollow(a.tipster!.username) : undefined}
                    followLoading={a.tipster?.username ? followLoading === a.tipster.username : false}
                  />
                );
              })}
            </div>
          )}
          {!loading && hasMore && (
            <div className="flex justify-center py-6">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-3 rounded-xl font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-70 transition-colors"
              >
                {loadingMore ? 'Loading...' : `Load more (${picks.length} of ${total})`}
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
