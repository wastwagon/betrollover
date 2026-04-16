'use client';

import { useEffect, useState, useMemo } from 'react';
import { useT } from '@/context/LanguageContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
import { getApiErrorMessage } from '@/lib/api-error-message';

const API_URL = getApiUrl();

const VALID_SPORT_KEYS = new Set([
  'football', 'basketball', 'rugby', 'mma', 'volleyball', 'hockey', 'american_football', 'tennis', 'multi',
]);

type PriceFilter = 'all' | 'free' | 'paid' | 'sold';
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
  roi?: number;
  totalPicks: number;
  wonPicks: number;
  lostPicks: number;
  rank: number | null;
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
  picksRevealed?: boolean;
  /** Set after POST /accumulators/:id/purchase for debugging/analytics; unveil modal uses merged `picks`. */
  purchasedTicket?: unknown;
}

interface User {
  id: number;
  displayName: string;
  email: string;
}

export default function MarketplacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [sportFilter, setSportFilter] = useState<string>('');
  const [tipsterSearch, setTipsterSearch] = useState('');
  const [debouncedTipster, setDebouncedTipster] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebouncedTipster(tipsterSearch.trim()), 350);
    return () => clearTimeout(id);
  }, [tipsterSearch]);
  const [followedTipsterUsernames, setFollowedTipsterUsernames] = useState<Set<string>>(new Set());
  const [followLoading, setFollowLoading] = useState<string | null>(null);
  const { showError, showSuccess, clearError, clearSuccess, error: toastError, success: toastSuccess } = useToast();

  // Sync sport + tipster search from URL (shareable links, back/forward)
  useEffect(() => {
    const sport = searchParams.get('sport');
    const value = sport && VALID_SPORT_KEYS.has(sport) ? sport : '';
    setSportFilter(value);
    const tip = searchParams.get('tipster') || '';
    setTipsterSearch(tip);
    setDebouncedTipster(tip);
    const pf = searchParams.get('priceFilter');
    if (pf === 'free' || pf === 'paid' || pf === 'sold') setPriceFilter(pf);
    else if (pf === 'all') setPriceFilter('all');
  }, [searchParams]);

  // Keep URL in sync with filters (debounced tipster avoids history spam while typing)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams();
    if (sportFilter) p.set('sport', sportFilter);
    if (debouncedTipster) p.set('tipster', debouncedTipster);
    if (priceFilter !== 'all') p.set('priceFilter', priceFilter);
    const qs = p.toString();
    const next = qs ? `/marketplace?${qs}` : '/marketplace';
    const cur = `${window.location.pathname}${window.location.search}`;
    if (cur !== next) router.replace(next, { scroll: false });
  }, [sportFilter, debouncedTipster, priceFilter, router]);

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
        showError(new Error(getApiErrorMessage(err, 'Failed to update follow')));
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
  }, [picks, sortBy, followedTipsterUsernames]);

  const tipsterParam = useMemo(
    () => (debouncedTipster ? `&tipsterSearch=${encodeURIComponent(debouncedTipster)}` : ''),
    [debouncedTipster],
  );
  const priceParam = useMemo(
    () => (priceFilter === 'all' ? '' : `&priceFilter=${encodeURIComponent(priceFilter)}`),
    [priceFilter],
  );

  const hasPendingMarketplace = useMemo(
    () => picks.some((p) => p.result === 'pending'),
    [picks],
  );

  useEffect(() => {
    const token = localStorage.getItem('token');
    const sportParam = sportFilter ? `&sport=${encodeURIComponent(sportFilter)}` : '';

    if (!token) {
      // Guest: use public marketplace (free + paid listings; login required to purchase/claim)
      fetch(`${API_URL}/accumulators/marketplace/public?limit=24${sportParam}${tipsterParam}${priceParam}`)
        .then((r) => (r.ok ? r.json() : { items: [], total: 0, hasMore: false }))
        .then((data) => {
          const items = data?.items ?? [];
          setPicks(items);
          setTotal(data?.total ?? items.length);
          setHasMore(data?.hasMore ?? false);
        })
        .catch((err) => {
          setPicks([]);
          setTotal(0);
          setHasMore(false);
          showError(err);
        })
        .finally(() => setLoading(false));
      return;
    }

    // Logged in: fetch marketplace, wallet, purchased, user, following
    Promise.all([
      fetch(`${API_URL}/accumulators/marketplace?limit=24${sportParam}${tipsterParam}${priceParam}`, {
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
  }, [router, sportFilter, tipsterParam, priceParam, showError]);

  /** Refresh coupon cards while any listing is still pending (visibility-aware, 45s). */
  useEffect(() => {
    if (!hasPendingMarketplace) return;
    const sportParam = sportFilter ? `&sport=${encodeURIComponent(sportFilter)}` : '';
    const poll = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      const token = localStorage.getItem('token');
      const url = token
        ? `${API_URL}/accumulators/marketplace?limit=24${sportParam}${tipsterParam}${priceParam}`
        : `${API_URL}/accumulators/marketplace/public?limit=24${sportParam}${tipsterParam}${priceParam}`;
      fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        .then((r) => (r.ok ? r.json() : { items: [], total: 0, hasMore: false }))
        .then((data) => {
          const items = data?.items ?? (Array.isArray(data) ? data : []);
          const totalCount = data?.total ?? items.length;
          const hasMoreFlag = data?.hasMore ?? false;
          setPicks(items);
          setTotal(totalCount);
          setHasMore(hasMoreFlag);
        })
        .catch(() => {});
    };
    const id = setInterval(poll, 45_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') poll();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [hasPendingMarketplace, sportFilter, tipsterParam, priceParam]);

  const recordView = (id: number) => {
    fetch(`${API_URL}/accumulators/${id}/view`, { method: 'POST' }).catch(() => {});
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    const token = localStorage.getItem('token');
    const sportParam = sportFilter ? `&sport=${encodeURIComponent(sportFilter)}` : '';
    const url = token
      ? `${API_URL}/accumulators/marketplace?limit=24&offset=${picks.length}${sportParam}${tipsterParam}${priceParam}`
      : `${API_URL}/accumulators/marketplace/public?limit=24&offset=${picks.length}${sportParam}${tipsterParam}${priceParam}`;
    setLoadingMore(true);
    try {
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
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
    if (!token) {
      router.push('/login?redirect=/marketplace');
      return;
    }

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
        try { (await import('@/lib/analytics')).trackEvent('coupon_purchased', { couponId: id }, token); } catch { /* noop */ }
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
        // Merge full picks from purchase response so unveil modal shows real legs immediately (list payload is redacted until refresh).
        setPicks((prev) =>
          prev.map((p) => {
            if (p.id !== id) return p;
            const merged: Accumulator = {
              ...p,
              purchasedTicket,
            };
            if (
              purchasedTicket &&
              typeof purchasedTicket === 'object' &&
              Array.isArray((purchasedTicket as { picks?: unknown }).picks)
            ) {
              merged.picks = (purchasedTicket as { picks: Pick[] }).picks;
            }
            return merged;
          }),
        );
        // Trigger unveil modal
        setUnveilCouponId(id);
      } else {
        const err = await res.json().catch(() => ({}));
        showError(new Error(getApiErrorMessage(err, 'Purchase failed')));
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
      <div className="dashboard-bg dashboard-pattern min-h-[calc(100vh-8rem)] w-full min-w-0 max-w-full overflow-x-hidden">
        <div className="section-ux-dashboard-shell">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-0 min-w-0">
            <PageHeader
              label={t('nav.marketplace')}
              title={t('marketplace.title')}
              tagline={t('marketplace.subtitle')}
            />
            {/* Contextual smart buttons — no hamburger needed */}
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto self-stretch sm:self-auto shrink-0 min-w-0">
              <Link
                href="/coupons/archive"
                className="inline-flex justify-center items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm font-medium text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors w-full sm:w-auto"
              >
                <span aria-hidden>📦</span> {t('header.settled_archive')}
              </Link>
              <Link
                href="/leaderboard"
                className="inline-flex justify-center items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm font-medium text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors w-full sm:w-auto"
              >
                <span aria-hidden>🏆</span> {t('nav.leaderboard')}
              </Link>
            </div>
          </div>

          {/* Full-width ad */}
          <div className="mb-4">
            <AdSlot zoneSlug="marketplace-full" fullWidth className="w-full" />
          </div>

          <div className="relative mb-4 rounded-2xl overflow-hidden border border-[var(--border)] h-28 sm:h-36 md:h-40 bg-[var(--card)]">
            <Image
              src="/images/marketing/marketplace-strip.png"
              alt=""
              fill
              className="object-cover object-center"
              sizes="(max-width: 1280px) 100vw, 1280px"
            />
            <div
              className="absolute inset-0 bg-gradient-to-r from-[var(--bg)]/85 via-[var(--bg)]/20 to-transparent pointer-events-none"
              aria-hidden
            />
          </div>

          {/* Sport tabs — scrollable on mobile */}
          <div className="mb-4 w-full min-w-0 overflow-hidden">
          <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 scrollbar-hide -mx-1 px-1 touch-pan-x [-webkit-overflow-scrolling:touch]">
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
          </div>

          {/* Filters — show after load so empty search results still have controls */}
          {!loading && (
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end mb-4 min-w-0 max-w-full">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 flex-1 min-w-0 w-full sm:min-w-[200px] sm:max-w-md">
                <label htmlFor="marketplace-tipster-search" className="text-sm font-medium text-[var(--text)] shrink-0">
                  {t('marketplace.tipster_search_label')}
                </label>
                <div className="relative flex-1 min-w-0">
                  <input
                    id="marketplace-tipster-search"
                    type="search"
                    enterKeyHint="search"
                    autoComplete="off"
                    placeholder={t('marketplace.tipster_search_placeholder')}
                    value={tipsterSearch}
                    onChange={(e) => setTipsterSearch(e.target.value)}
                    className="w-full px-3 py-2 pr-24 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                  {tipsterSearch.trim() !== debouncedTipster && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[var(--text-muted)] pointer-events-none">
                      {t('marketplace.tipster_search_loading')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 w-full sm:w-auto min-w-0">
                <label className="text-sm font-medium text-[var(--text)] shrink-0">Price</label>
                <select
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value as PriceFilter)}
                  className="w-full sm:w-auto sm:min-w-[120px] px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="all">All</option>
                  <option value="free">Free only</option>
                  <option value="paid">Paid only</option>
                  <option value="sold">Sold only</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 w-full sm:w-auto min-w-0">
                <label className="text-sm font-medium text-[var(--text)] shrink-0">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="w-full sm:w-auto sm:min-w-[140px] px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
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
              {(priceFilter !== 'all' || sortBy !== 'newest' || debouncedTipster) && (
                <button
                  type="button"
                  onClick={() => {
                    setPriceFilter('all');
                    setSortBy('newest');
                    setTipsterSearch('');
                  }}
                  className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
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
                title={debouncedTipster ? t('marketplace.no_tipster_matches') : t('marketplace.no_picks')}
                description={
                  debouncedTipster ? t('marketplace.tipster_search_empty_hint') : t('marketplace.no_picks_sub')
                }
                actionLabel={debouncedTipster ? t('common.clear') : t('nav.create_coupon')}
                actionHref={debouncedTipster ? undefined : '/create-pick'}
                onActionClick={
                  debouncedTipster
                    ? () => {
                        setTipsterSearch('');
                        setDebouncedTipster('');
                      }
                    : undefined
                }
                imageSrc="/images/marketing/marketplace-strip.png"
                imageAlt=""
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
                  setTipsterSearch('');
                }}
                icon="🔍"
              />
            </div>
          )}
          {!loading && filteredAndSortedPicks.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8 min-w-0">
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
                    picksRevealed={a.picksRevealed === true}
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
            <div className="flex justify-center py-6 px-1">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full max-w-md sm:w-auto px-6 py-3 rounded-xl font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-70 transition-colors"
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
