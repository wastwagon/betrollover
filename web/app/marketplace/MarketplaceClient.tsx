'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useT } from '@/context/LanguageContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { DashboardShell } from '@/components/DashboardShell';
import { PageHeader } from '@/components/PageHeader';
import { AccaFamilyNav } from '@/components/AccaFamilyNav';
import { Button, buttonClassName } from '@/components/ui/Button';
import { AdSlot } from '@/components/AdSlot';
import { PickCard } from '@/components/PickCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/hooks/useToast';
import { formatError } from '@/utils/errorMessages';
import { ErrorToast } from '@/components/ErrorToast';
import { SuccessToast } from '@/components/SuccessToast';
import { EscrowTrustCallout } from '@/components/EscrowTrustCallout';
import { GrowthDistributionStrip } from '@/components/GrowthDistributionStrip';
import { PullToRefresh } from '@/components/ios/PullToRefresh';
import { MarketplaceFilterBar } from '@/components/ios/MarketplaceFilterBar';
import { matchesMarketplaceDayFilter, type MarketplaceDayFilter } from '@/lib/acca-desk-board-badge';
import { getApiUrl } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { getPickCardSocialProps, mergeSocialCountsIntoList } from '@/lib/pick-card-social';
import { currentLoginRedirectPath } from '@/lib/login-redirect-path';
import {
  FOOTBALL_SPORT_KEY,
  filterDiscoverySports,
  isDiscoverySportAllowed,
  isFootballOnlyDiscovery,
} from '@/lib/football-only-discovery';
import { isSubscriptionsEnabled } from '@/lib/subscriptions-enabled';
import { MarketplaceSavedFiltersBar } from '@/components/MarketplaceSavedFiltersBar';
import { MarketplaceBookingCodesShelf } from '@/components/MarketplaceBookingCodesShelf';
import type { MarketplaceSavedFilter } from '@/lib/marketplace-saved-filters';

const API_URL = getApiUrl();

const VALID_SPORT_KEYS_ALL = [
  'football', 'basketball', 'rugby', 'mma', 'volleyball', 'hockey', 'american_football', 'tennis', 'multi',
] as const;
const VALID_SPORT_KEYS = new Set<string>(
  filterDiscoverySports([...VALID_SPORT_KEYS_ALL]),
);

type PriceFilter = 'all' | 'free' | 'paid';
type DayFilter = MarketplaceDayFilter;
type SortBy = 'newest' | 'price-low' | 'price-high' | 'tipster-rank' | 'following-only' | 'relevance';

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
  isAi?: boolean;
  isVerified?: boolean;
  tipsterType?: string | null;
  tipster_type?: string | null;
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
  commentCount?: number;
  picks: Pick[];
  tipster?: Tipster | null;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
  result?: string;
  avgRating?: number | null;
  reviewCount?: number | null;
  picksRevealed?: boolean;
  bookmakerKey?: string | null;
  bookingCode?: string | null;
  bookingCodeCopyCount?: number;
  /** Set after POST /accumulators/:id/purchase for debugging/analytics; unveil modal uses merged `picks`. */
  purchasedTicket?: unknown;
}

interface User {
  id: number;
  displayName: string;
  email: string;
}

export default function MarketplacePage({
  initialPicks = [],
  initialTotal = 0,
  initialHasMore = false,
}: {
  initialPicks?: Accumulator[] | Record<string, unknown>[];
  initialTotal?: number;
  initialHasMore?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  const [picks, setPicks] = useState<Accumulator[]>(() => (initialPicks as Accumulator[]) ?? []);
  const [total, setTotal] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(initialPicks.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [purchasedIds, setPurchasedIds] = useState<Set<number>>(new Set());
  const [unveilCouponId, setUnveilCouponId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [dayFilter, setDayFilter] = useState<DayFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const footballOnly = isFootballOnlyDiscovery();
  const [sportFilter, setSportFilter] = useState<string>(footballOnly ? FOOTBALL_SPORT_KEY : '');
  const [tipsterSearch, setTipsterSearch] = useState('');
  const [debouncedTipster, setDebouncedTipster] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebouncedTipster(tipsterSearch.trim()), 350);
    return () => clearTimeout(id);
  }, [tipsterSearch]);
  const [followedTipsterUsernames, setFollowedTipsterUsernames] = useState<Set<string>>(new Set());
  const [autoPurchaseHandled, setAutoPurchaseHandled] = useState(false);
  const relevanceDefaultApplied = useRef(false);
  const { showError, showSuccess, clearError, clearSuccess, error: toastError, success: toastSuccess } = useToast();

  // Sync sport + tipster search + sort from URL (shareable links, back/forward)
  useEffect(() => {
    const sport = searchParams.get('sport');
    if (footballOnly) {
      setSportFilter(FOOTBALL_SPORT_KEY);
    } else {
      const value = sport && VALID_SPORT_KEYS.has(sport) ? sport : '';
      setSportFilter(value);
    }
    const tip = searchParams.get('tipster') || '';
    setTipsterSearch(tip);
    setDebouncedTipster(tip);
    const pf = searchParams.get('priceFilter');
    if (pf === 'free' || pf === 'paid') setPriceFilter(pf);
    else if (pf === 'sold') setPriceFilter('paid'); // legacy URL; Sold removed from UI
    else if (pf === 'all') setPriceFilter('all');
    const day = searchParams.get('day');
    if (day === 'today' || day === 'tomorrow') setDayFilter(day);
    else if (day === 'all' || day == null) setDayFilter('all');
    const sort = searchParams.get('sort');
    if (
      sort === 'newest' ||
      sort === 'price-low' ||
      sort === 'price-high' ||
      sort === 'tipster-rank' ||
      sort === 'following-only' ||
      sort === 'relevance'
    ) {
      setSortBy(sort);
    }
  }, [searchParams, footballOnly]);

  // Keep URL in sync with filters (debounced tipster avoids history spam while typing)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams();
    if (sportFilter) p.set('sport', sportFilter);
    if (debouncedTipster) p.set('tipster', debouncedTipster);
    if (priceFilter !== 'all') p.set('priceFilter', priceFilter);
    if (dayFilter !== 'all') p.set('day', dayFilter);
    // Always persist sort (incl. newest) so auto “For you” can’t overwrite an explicit newest choice.
    p.set('sort', sortBy);
    const qs = p.toString();
    const next = qs ? `/marketplace?${qs}` : '/marketplace';
    const cur = `${window.location.pathname}${window.location.search}`;
    if (cur !== next) router.replace(next, { scroll: false });
  }, [sportFilter, debouncedTipster, priceFilter, dayFilter, sortBy, router]);

  const filteredAndSortedPicks = useMemo(() => {
    let list = [...picks]; // API already filters by sport when sportFilter is set
    if (footballOnly) {
      list = list.filter((p) => isDiscoverySportAllowed(p.sport));
    }
    if (dayFilter !== 'all') {
      list = list.filter((p) =>
        matchesMarketplaceDayFilter(dayFilter, {
          title: p.title,
          tipsterType: p.tipster?.tipsterType ?? p.tipster?.tipster_type,
          picks: p.picks,
        }),
      );
    }
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
    } else if (sortBy === 'relevance') {
      const score = (p: Accumulator) => {
        let s = 0;
        if (p.tipster?.username && followedTipsterUsernames.has(p.tipster.username)) s += 100;
        if (p.price === 0) s += 25;
        const rank = p.tipster?.rank ?? 999;
        s += Math.max(0, 40 - Math.min(rank, 40));
        s += Math.min(20, Number(p.purchaseCount) || 0);
        const ageH = (Date.now() - new Date(p.createdAt || 0).getTime()) / 3_600_000;
        s += Math.max(0, 15 - ageH);
        return s;
      };
      list.sort((a, b) => score(b) - score(a));
    }
    return list;
  }, [picks, sortBy, followedTipsterUsernames, footballOnly, dayFilter]);

  const filterCounts = useMemo(() => {
    let base = [...picks];
    if (footballOnly) {
      base = base.filter((p) => isDiscoverySportAllowed(p.sport));
    }
    let today = 0;
    let tomorrow = 0;
    for (const p of base) {
      const opts = {
        title: p.title,
        tipsterType: p.tipster?.tipsterType ?? p.tipster?.tipster_type,
        picks: p.picks,
      };
      if (matchesMarketplaceDayFilter('today', opts)) today += 1;
      if (matchesMarketplaceDayFilter('tomorrow', opts)) tomorrow += 1;
    }
    const dayScoped =
      dayFilter === 'all'
        ? base
        : base.filter((p) =>
            matchesMarketplaceDayFilter(dayFilter, {
              title: p.title,
              tipsterType: p.tipster?.tipsterType ?? p.tipster?.tipster_type,
              picks: p.picks,
            }),
          );
    let free = 0;
    let paid = 0;
    for (const p of dayScoped) {
      if (Number(p.price) === 0) free += 1;
      else paid += 1;
    }
    return {
      day: { all: base.length, today, tomorrow },
      // Price is also applied server-side — only show free/paid tallies when browsing All.
      price:
        priceFilter === 'all'
          ? { all: dayScoped.length, free, paid }
          : { all: dayScoped.length, free: priceFilter === 'free' ? dayScoped.length : 0, paid: priceFilter === 'paid' ? dayScoped.length : 0 },
    };
  }, [picks, footballOnly, dayFilter, priceFilter]);

  const bookingCodeShelfItems = useMemo(() => {
    return filteredAndSortedPicks
      .filter(
        (p) =>
          !!p.bookmakerKey &&
          !!p.bookingCode &&
          (p.price === 0 || p.picksRevealed === true || purchasedIds.has(p.id)),
      )
      .slice(0, 8)
      .map((p) => ({
        id: p.id,
        title: p.title,
        bookmakerKey: p.bookmakerKey as string,
        bookingCode: p.bookingCode as string,
        bookingCodeCopyCount: p.bookingCodeCopyCount ?? 0,
        tipsterName: p.tipster?.displayName ?? null,
      }));
  }, [filteredAndSortedPicks, purchasedIds]);

  // Once following is known, prefer "For you" only when URL has no explicit sort yet.
  useEffect(() => {
    if (relevanceDefaultApplied.current) return;
    if (followedTipsterUsernames.size === 0) return;
    const sortParam = searchParams.get('sort');
    if (sortParam) {
      relevanceDefaultApplied.current = true;
      return;
    }
    setSortBy('relevance');
    relevanceDefaultApplied.current = true;
  }, [followedTipsterUsernames, searchParams]);

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

  const fetchMarketplaceRef = useRef<() => Promise<void>>(async () => {});

  const fetchMarketplace = useCallback(async () => {
    const token = localStorage.getItem('token');
    const effectiveSport = footballOnly ? FOOTBALL_SPORT_KEY : sportFilter;
    const sportParam = effectiveSport ? `&sport=${encodeURIComponent(effectiveSport)}` : '';
    const listUrl = `${API_URL}/accumulators/marketplace/public?limit=24${sportParam}${tipsterParam}${priceParam}`;
    const listHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    const listPromise = fetch(listUrl, { headers: listHeaders }).then((r) =>
      r.ok ? r.json() : { items: [], total: 0, hasMore: false },
    );

    if (!token) {
      try {
        const marketplaceData = await listPromise;
        const items = marketplaceData?.items ?? (Array.isArray(marketplaceData) ? marketplaceData : []);
        setPicks(items);
        setTotal(marketplaceData?.total ?? items.length);
        setHasMore(marketplaceData?.hasMore ?? false);
        setWalletBalance(null);
        setCurrentUserId(null);
        setPurchasedIds(new Set());
        setFollowedTipsterUsernames(new Set());
      } catch (err) {
        setPicks([]);
        setTotal(0);
        setHasMore(false);
        showError(err);
      } finally {
        setLoading(false);
      }
      return;
    }

    await Promise.all([
      listPromise,
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
  }, [sportFilter, tipsterParam, priceParam, showError, footballOnly]);

  fetchMarketplaceRef.current = fetchMarketplace;

  useEffect(() => {
    void fetchMarketplace();
  }, [fetchMarketplace]);

  /** Refresh coupon cards while any listing is still pending (visibility-aware, 45s). */
  useEffect(() => {
    if (!hasPendingMarketplace) return;
    const sportParam = sportFilter ? `&sport=${encodeURIComponent(sportFilter)}` : '';
    const poll = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const url = `${API_URL}/accumulators/marketplace/public?limit=24${sportParam}${tipsterParam}${priceParam}`;
      fetch(url, { headers })
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
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    const sportParam = sportFilter ? `&sport=${encodeURIComponent(sportFilter)}` : '';
    const url = `${API_URL}/accumulators/marketplace/public?limit=24&offset=${picks.length}${sportParam}${tipsterParam}${priceParam}`;
    setLoadingMore(true);
    try {
      const res = await fetch(url, { headers });
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

  const purchase = useCallback(async (id: number) => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login?redirect=/marketplace');
      return;
    }

    const coupon = picks.find(p => p.id === id);
    if (!coupon) return;

    // Check wallet balance for paid coupons
    if (coupon.price > 0 && (walletBalance === null || walletBalance < coupon.price)) {
      const continuePath = `/marketplace?autoPurchase=${id}&autoAttemptId=${Date.now()}`;
      showError(
        new Error(
          `${t('pick_card.top_up_wallet_to_purchase')}. ${t('wallet.balance')}: GHS ${walletBalance?.toFixed(2) || '0.00'}`,
        ),
      );
      router.push(`/wallet?continue=${encodeURIComponent(continuePath)}`);
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
        const { hapticSuccess } = await import('@/lib/haptic');
        hapticSuccess();
        showSuccess(t('tipster.toast_pick_purchased'));
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
  }, [picks, router, showError, showSuccess, t, walletBalance]);

  useEffect(() => {
    if (autoPurchaseHandled) return;
    const autoPurchaseRaw = searchParams.get('autoPurchase');
    if (!autoPurchaseRaw) return;
    const id = Number(autoPurchaseRaw);
    if (!Number.isFinite(id) || id <= 0) return;
    if (loading) return;
    if (purchasing !== null) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const coupon = picks.find((p) => p.id === id);
    if (!coupon) return;
    if (coupon.price > 0 && (walletBalance === null || walletBalance < coupon.price)) return;
    setAutoPurchaseHandled(true);
    void purchase(id);
  }, [autoPurchaseHandled, searchParams, loading, purchasing, picks, walletBalance, purchase]);

  const renderMarketplacePickCard = (a: Accumulator) => {
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
        {...getPickCardSocialProps(a, {
          onCountsChange: (id, counts) =>
            setPicks((prev) => mergeSocialCountsIntoList(prev, id, counts)),
          loginRedirectPath: currentLoginRedirectPath('/marketplace'),
        })}
        avgRating={a.avgRating}
        reviewCount={a.reviewCount}
        status={a.status}
        result={a.result}
        picks={a.picks || []}
        tipster={a.tipster}
        picksRevealed={a.picksRevealed === true}
        bookmakerKey={a.bookmakerKey}
        bookingCode={a.bookingCode}
        bookingCodeCopyCount={a.bookingCodeCopyCount ?? 0}
        isPurchased={isPurchased}
        canPurchase={canPurchase}
        expandableLegs
        walletBalance={walletBalance}
        onPurchase={() => purchase(a.id)}
        purchasing={purchasing === a.id}
        showUnveil={unveilCouponId === a.id}
        onUnveilClose={() => setUnveilCouponId(null)}
        onView={() => recordView(a.id)}
        createdAt={a.createdAt}
      />
    );
  };

  return (
    <DashboardShell>
      {toastError ? <ErrorToast error={toastError} onClose={clearError} /> : null}
      {toastSuccess ? <SuccessToast message={toastSuccess} onClose={clearSuccess} /> : null}
      <div className="min-h-[calc(100vh-8rem)] w-full min-w-0 max-w-full bg-[var(--bg)]">
        <PullToRefresh onRefresh={() => fetchMarketplaceRef.current()} disabled={loading}>
        <div className="section-ux-dashboard-shell">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-0 min-w-0">
            <PageHeader
              label={t('nav.marketplace')}
              title={t('marketplace.title')}
              tagline={t('marketplace.subtitle')}
            />
            {/* Contextual smart buttons — no hamburger needed */}
            <div className="hidden sm:flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto self-stretch sm:self-auto shrink-0 min-w-0">
              <Link
                href="/coupons/archive"
                className={buttonClassName({ variant: 'secondary', size: 'sm', className: 'w-full sm:w-auto' })}
              >
                {t('header.settled_archive')}
              </Link>
              <Link
                href="/leaderboard"
                className={buttonClassName({ variant: 'secondary', size: 'sm', className: 'w-full sm:w-auto' })}
              >
                {t('nav.leaderboard')}
              </Link>
            </div>
          </div>
          <AccaFamilyNav current="buy" />

          {!footballOnly && sportFilter ? (
            <div className="mb-4 rounded-2xl border border-[var(--separator)] bg-[var(--card)] px-4 py-3.5">
              <p className="text-sm font-semibold text-[var(--text)]">
                {t('marketplace.sport_hub_title', {
                  sport:
                    (
                      {
                        football: t('nav.football'),
                        basketball: t('nav.basketball'),
                        rugby: t('nav.rugby'),
                        mma: t('nav.mma'),
                        volleyball: t('nav.volleyball'),
                        hockey: t('nav.hockey'),
                        american_football: t('nav.american_football'),
                        tennis: t('nav.tennis'),
                        multi: t('nav.sports'),
                      } as Record<string, string>
                    )[sportFilter] || sportFilter,
                })}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                {t('marketplace.sport_hub_body', {
                  sport:
                    (
                      {
                        football: t('nav.football'),
                        basketball: t('nav.basketball'),
                        rugby: t('nav.rugby'),
                        mma: t('nav.mma'),
                        volleyball: t('nav.volleyball'),
                        hockey: t('nav.hockey'),
                        american_football: t('nav.american_football'),
                        tennis: t('nav.tennis'),
                        multi: t('nav.sports'),
                      } as Record<string, string>
                    )[sportFilter] || sportFilter,
                })}
              </p>
            </div>
          ) : null}

          {/* Sticky discovery chrome — one compact rail so picks stay the visual hero */}
          <div className="sticky-below-chrome -mx-4 px-4 sm:-mx-6 sm:px-6 py-2 mb-4 bg-[var(--bg)]/95 backdrop-blur-md border-b border-[var(--separator)]">
            {!footballOnly ? (
            <div
              className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 mb-2 scrollbar-hide -mx-1 px-1 touch-pan-x [-webkit-overflow-scrolling:touch]"
              role="group"
              aria-label={t('marketplace.filter_all_sports')}
            >
              {(
                    [
                      { key: '', label: t('marketplace.filter_all_sports') },
                      { key: 'football', label: t('nav.football') },
                      { key: 'basketball', label: t('nav.basketball') },
                      { key: 'rugby', label: t('nav.rugby') },
                      { key: 'mma', label: t('nav.mma') },
                      { key: 'volleyball', label: t('nav.volleyball') },
                      { key: 'hockey', label: t('nav.hockey') },
                      { key: 'american_football', label: t('nav.american_football') },
                      { key: 'tennis', label: t('nav.tennis') },
                      { key: 'multi', label: t('nav.sports') },
                    ] as { key: string; label: string }[]
                  ).map(({ key, label }) => (
                    <button
                      key={`sport-${key || 'all'}`}
                      type="button"
                      onClick={() => setSportFilter(key)}
                      className={`flex-shrink-0 touch-target px-3.5 py-1.5 rounded-full font-medium text-sm transition-colors ${
                        sportFilter === key
                          ? 'bg-[var(--text)] text-[var(--card)]'
                          : 'bg-[var(--fill-secondary)] text-[var(--text-muted)] hover:text-[var(--text)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
            </div>
            ) : null}

            <p className="mb-2 px-0.5 text-[11px] sm:text-xs text-[var(--text-tertiary)] leading-snug">
              {t('marketplace.escrow_note')}
            </p>

            {!loading && (
              <>
              <MarketplaceSavedFiltersBar
                hasActiveFilters={
                  priceFilter !== 'all' ||
                  dayFilter !== 'all' ||
                  sortBy !== 'newest' ||
                  !!debouncedTipster ||
                  (!footballOnly && !!sportFilter)
                }
                current={{
                  desk: 'all',
                  dayFilter,
                  priceFilter,
                  sortBy,
                  tipsterSearch: debouncedTipster,
                  sport: footballOnly ? FOOTBALL_SPORT_KEY : sportFilter,
                }}
                onApply={(f: MarketplaceSavedFilter) => {
                  setPriceFilter(f.priceFilter === 'sold' ? 'paid' : f.priceFilter);
                  setDayFilter(f.dayFilter ?? 'all');
                  setSortBy(f.sortBy);
                  setTipsterSearch(f.tipsterSearch);
                  setDebouncedTipster(f.tipsterSearch);
                  if (!footballOnly) setSportFilter(f.sport);
                }}
              />
              <MarketplaceFilterBar
                priceFilter={priceFilter}
                onPriceFilterChange={setPriceFilter}
                dayFilter={dayFilter}
                onDayFilterChange={setDayFilter}
                sortBy={sortBy}
                onSortByChange={setSortBy}
                tipsterSearch={tipsterSearch}
                onTipsterSearchChange={setTipsterSearch}
                debouncedTipster={debouncedTipster}
                showFollowingSort={followedTipsterUsernames.size > 0}
                counts={filterCounts}
                hasActiveFilters={
                  priceFilter !== 'all' ||
                  dayFilter !== 'all' ||
                  sortBy !== 'newest' ||
                  !!debouncedTipster
                }
                onClear={() => {
                  setPriceFilter('all');
                  setDayFilter('all');
                  setSortBy('newest');
                  setTipsterSearch('');
                  setDebouncedTipster('');
                }}
                labels={{
                  filterPrice: t('marketplace.filter_price'),
                  filterDay: t('marketplace.filter_day'),
                  all: t('common.all'),
                  free: t('marketplace.filter_free_only'),
                  paid: t('marketplace.filter_paid_only'),
                  dayToday: t('marketplace.filter_today'),
                  dayTomorrow: t('marketplace.filter_tomorrow'),
                  sortBy: t('marketplace.sort_by'),
                  sortNewest: t('marketplace.sort_newest_first'),
                  sortRelevance: t('marketplace.sort_relevance'),
                  sortFollowing: t('marketplace.sort_following_only'),
                  sortPriceAsc: t('marketplace.sort_price_asc'),
                  sortPriceDesc: t('marketplace.sort_price_desc'),
                  sortRank: t('marketplace.sort_tipster_rank'),
                  tipsterSearch: t('marketplace.tipster_search_label'),
                  tipsterPlaceholder: t('marketplace.tipster_search_placeholder'),
                  tipsterSearching: t('marketplace.tipster_search_loading'),
                  moreFilters: t('marketplace.sort_by'),
                  clearFilters: t('marketplace.clear_filters'),
                  done: t('common.close'),
                }}
              />
              </>
            )}
          </div>

          {loading && (
            <LoadingSkeleton
              count={8}
              variant="cards"
              cardsGridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8 min-w-0"
            />
          )}
          {!loading && picks.length === 0 && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]">
              <EmptyState
                title={debouncedTipster ? t('marketplace.no_tipster_matches') : t('marketplace.no_picks')}
                description={
                  debouncedTipster ? t('marketplace.tipster_search_empty_hint') : t('marketplace.no_picks_sub')
                }
                actionLabel={debouncedTipster ? t('common.clear') : t('nav.create_pick')}
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
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
              <EmptyState
                title={t('common.no_results')}
                description={t('marketplace.no_picks_sub')}
                actionLabel={t('common.clear')}
                onActionClick={() => {
                  setPriceFilter('all');
                  setDayFilter('all');
                  setSortBy('newest');
                  setTipsterSearch('');
                  setDebouncedTipster('');
                }}
              />
            </div>
          )}
          {!loading && filteredAndSortedPicks.length > 0 && (
            <>
              <MarketplaceBookingCodesShelf items={bookingCodeShelfItems} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8 min-w-0">
                {filteredAndSortedPicks.map((a) => renderMarketplacePickCard(a))}
              </div>
            </>
          )}
          {!loading && hasMore && (
            <div className="flex justify-center py-6 px-1">
              <Button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full max-w-md sm:w-auto"
              >
                {loadingMore ? t('common.loading') : t('marketplace.load_more_count', { shown: String(picks.length), total: String(total) })}
              </Button>
            </div>
          )}

          {/* Demoted below inventory — escrow, guides, growth, marketing, ads */}
          <EscrowTrustCallout
            className="mb-4 mt-2"
            title={t('marketplace.trust_callout_title')}
            body={t('marketplace.trust_callout_body')}
            linkLabel={t('home.how_it_works')}
          />
          <GrowthDistributionStrip compact className="mb-4" />
          <div className="mb-4 flex flex-wrap justify-center gap-2 sm:gap-3 text-sm max-w-3xl mx-auto px-1">
            <Link
              href="/tipsters"
              className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)]/60 px-3 py-1.5 text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
            >
              {t('nav.tipsters')}
            </Link>
            <Link
              href="/how-it-works#faq"
              className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)]/60 px-3 py-1.5 text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
            >
              {t('home.how_it_works')}
            </Link>
            <Link
              href="/guides/escrow-refunds"
              className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)]/60 px-3 py-1.5 text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
            >
              {t('subscriptions.marketplace_link_escrow')}
            </Link>
            <Link
              href="/guides/evaluate-tipsters"
              className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)]/60 px-3 py-1.5 text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
            >
              {t('subscriptions.marketplace_link_eval')}
            </Link>
            {isSubscriptionsEnabled() ? (
              <Link
                href="/subscriptions/marketplace"
                className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)]/60 px-3 py-1.5 text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
              >
                {t('nav.subscription_marketplace')}
              </Link>
            ) : null}
          </div>
          <div className="relative mb-4 hidden sm:block rounded-2xl overflow-hidden border border-[var(--border)] h-28 sm:h-36 md:h-40 bg-[var(--card)]">
            <Image
              src="/images/marketing/marketplace-strip.png"
              alt=""
              fill
              fetchPriority="low"
              className="object-cover object-center"
              sizes="(max-width: 1280px) 100vw, 1280px"
            />
            <div
              className="absolute inset-0 bg-gradient-to-r from-[var(--bg)]/85 via-[var(--bg)]/20 to-transparent pointer-events-none"
              aria-hidden
            />
          </div>
          <div className="mb-4">
            <AdSlot zoneSlug="marketplace-full" fullWidth className="w-full" />
          </div>
        </div>
        </PullToRefresh>
      </div>
    </DashboardShell>
  );
}
