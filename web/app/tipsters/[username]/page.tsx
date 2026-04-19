'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AdSlot } from '@/components/AdSlot';
import { PickCard } from '@/components/PickCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/hooks/useToast';
import { ErrorToast } from '@/components/ErrorToast';
import { SuccessToast } from '@/components/SuccessToast';
import { getApiUrl, getAvatarUrl, shouldUnoptimizeGoogleAvatar } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { PersonJsonLd } from '@/components/PersonJsonLd';
import { useT } from '@/context/LanguageContext';
import { FollowersCountButton } from '@/components/TipsterFollowersModal';
import { AiTipsterBadge } from '@/components/AiTipsterBadge';

interface Pick {
  id?: number;
  matchDescription?: string;
  prediction?: string;
  odds?: number;
  matchDate?: string | Date;
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
}

interface MarketplaceCoupon {
  id: number;
  title: string;
  sport?: string;
  totalOdds: number;
  totalPicks: number;
  price: number;
  purchaseCount?: number;
  picks: Pick[];
  tipster?: Tipster | null;
  createdAt?: string;
  status?: string;
  result?: string;
}

interface SubscriptionPackage {
  id: number;
  name: string;
  price: number;
  durationDays: number;
  roiGuaranteeMin?: number | null;
  roiGuaranteeEnabled: boolean;
}

type TipsterPerformancePeriod = 'all' | 'week' | 'month' | 'd60' | 'd90';

const TIPSTER_PERFORMANCE_OPTIONS: TipsterPerformancePeriod[] = ['all', 'week', 'month', 'd60', 'd90'];

const TIPSTER_PERFORMANCE_LABELS: Record<TipsterPerformancePeriod, string> = {
  all: 'tipster.period_alltime',
  week: 'tipster.period_weekly',
  month: 'tipster.period_monthly',
  d60: 'tipster.performance_60d',
  d90: 'tipster.performance_90d',
};

function tipsterProfileQuery(period: TipsterPerformancePeriod, postedRange: { from: string; to: string } | null): string {
  if (postedRange?.from && postedRange?.to) {
    return `?from=${encodeURIComponent(postedRange.from)}&to=${encodeURIComponent(postedRange.to)}`;
  }
  if (period === 'all') return '';
  return `?performance=${encodeURIComponent(period)}`;
}

interface TipsterProfile {
  tipster: {
    id: number;
    user_id?: number | null;
    username: string;
    display_name: string;
    avatar_url: string | null;
    bio: string | null;
    /** Platform AI tipster */
    is_ai?: boolean;
    total_predictions: number;
    total_wins: number;
    total_losses: number;
    win_rate: number;
    roi: number;
    current_streak: number;
    best_streak?: number | null;
    leaderboard_rank: number | null;
    follower_count?: number;
    total_profit?: number;
    avg_odds?: number;
  };
  marketplace_coupons: MarketplaceCoupon[];
  archived_coupons?: MarketplaceCoupon[];
  /** Total settled count (won/lost/void) for Archive tab label. Backend may cap list at 50. */
  archived_settled_count?: number;
  is_following: boolean;
  performance_period?: TipsterPerformancePeriod | null;
  posted_date_range?: { from: string; to: string } | null;
}

export default function TipsterProfilePage() {
  const params = useParams();
  const router = useRouter();
  const t = useT();
  const username = params.username as string;
  const [profile, setProfile] = useState<TipsterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [purchasedIds, setPurchasedIds] = useState<Set<number>>(new Set());
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [unveilCouponId, setUnveilCouponId] = useState<number | null>(null);
  const [couponFilter, setCouponFilter] = useState<'active' | 'archive'>('active');
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [subscriptionPackages, setSubscriptionPackages] = useState<SubscriptionPackage[]>([]);
  const [subscribeLoading, setSubscribeLoading] = useState<number | null>(null);
  const [subscribedPackageIds, setSubscribedPackageIds] = useState<Set<number>>(new Set());
  const [isAuthed, setIsAuthed] = useState(false);
  const [viewerIsAdmin, setViewerIsAdmin] = useState(false);
  const [reviewSummary, setReviewSummary] = useState<{ avg: number; total: number } | null>(null);
  const [performancePeriod, setPerformancePeriod] = useState<TipsterPerformancePeriod>('all');
  /** Applied calendar range (coupon posted date); takes precedence over preset `performance` in the API. */
  const [postedRange, setPostedRange] = useState<{ from: string; to: string } | null>(null);
  const [dateFromDraft, setDateFromDraft] = useState('');
  const [dateToDraft, setDateToDraft] = useState('');
  /** Snapshot of tipster row from last all-time fetch — keeps JSON-LD stable when viewing shorter periods. */
  const allTimeTipsterForLdRef = useRef<TipsterProfile['tipster'] | null>(null);
  const { showError, showSuccess, clearError, clearSuccess, error: toastError, success: toastSuccess } = useToast();

  const refetchProfile = useCallback(() => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const q = tipsterProfileQuery(performancePeriod, postedRange);
    fetch(`${getApiUrl()}/tipsters/${encodeURIComponent(username)}${q}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (p) setProfile(p);
      })
      .catch(() => {});
  }, [username, performancePeriod, postedRange]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const q = tipsterProfileQuery(performancePeriod, postedRange);

    fetch(`${getApiUrl()}/tipsters/${encodeURIComponent(username)}${q}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (cancelled) return;
        setProfile(p);
        if (p?.tipster && !postedRange && performancePeriod === 'all') {
          allTimeTipsterForLdRef.current = p.tipster;
        }
        if (p?.tipster?.id) {
          fetch(`${getApiUrl()}/reviews/tipster/${p.tipster.id}?limit=5`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
              if (!cancelled && d) setReviewSummary({ avg: d.avg, total: d.total });
            })
            .catch(() => {});
        } else {
          setReviewSummary(null);
        }
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [username, performancePeriod, postedRange]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthed(!!token);
    if (!token) return;
    Promise.all([
      fetch(`${getApiUrl()}/wallet/balance`, { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch(`${getApiUrl()}/accumulators/purchased`, { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
        r.ok ? r.json() : [],
      ),
      fetch(`${getApiUrl()}/users/me`, { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
        r.ok ? r.json() : null,
      ),
    ]).then(([walletData, purchasedData, me]) => {
      if (walletData) setWalletBalance(Number(walletData.balance));
      if (Array.isArray(purchasedData)) {
        setPurchasedIds(new Set(purchasedData.map((p: any) => p.accumulatorId || p.pick?.id)));
      }
      setViewerIsAdmin(me?.role === 'admin');
    });
  }, [profile?.marketplace_coupons?.length]);

  useEffect(() => {
    if (!username) return;
    fetch(`${getApiUrl()}/subscriptions/packages/by-username/${encodeURIComponent(username)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((arr: SubscriptionPackage[]) => setSubscriptionPackages(Array.isArray(arr) ? arr : []))
      .catch(() => setSubscriptionPackages([]));
  }, [username]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${getApiUrl()}/subscriptions/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((arr: { packageId?: number; package?: { id?: number } }[]) => {
        const ids = new Set<number>();
        (Array.isArray(arr) ? arr : []).forEach((s) => {
          const pkgId = s.package?.id ?? s.packageId;
          if (pkgId && (s as { status?: string }).status === 'active') ids.add(pkgId);
        });
        setSubscribedPackageIds(ids);
      })
      .catch(() => {});
  }, [profile?.tipster?.id]);

  const handleSubscribe = async (packageId: number) => {
    const token = localStorage.getItem('token');
    const checkoutPath = `/subscriptions/checkout?packageId=${packageId}&fromTipster=${encodeURIComponent(username)}`;
    if (!token) {
      router.push(`/login?redirect=${encodeURIComponent(checkoutPath)}`);
      return;
    }
    const pkg = subscriptionPackages.find((p) => p.id === packageId);
    if (!pkg) return;
    // Unknown balance or insufficient funds: route to checkout where top-up+return flow is handled.
    if (pkg.price > 0 && (walletBalance === null || walletBalance < pkg.price)) {
      router.push(checkoutPath);
      return;
    }
    setSubscribeLoading(packageId);
    try {
      const res = await fetch(`${getApiUrl()}/subscriptions/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ packageId }),
      });
      if (res.ok) {
        showSuccess(t('tipster.toast_subscribed', { name: pkg.name }));
        setSubscribedPackageIds((prev) => new Set(Array.from(prev).concat(packageId)));
        const walletRes = await fetch(`${getApiUrl()}/wallet/balance`, { headers: { Authorization: `Bearer ${token}` } });
        if (walletRes.ok) {
          const d = await walletRes.json();
          setWalletBalance(Number(d.balance));
        }
      } else {
        const err = await res.json().catch(() => ({}));
        showError(new Error(getApiErrorMessage(err, 'Subscribe failed')));
      }
    } catch (e: any) {
      showError(e);
    } finally {
      setSubscribeLoading(null);
    }
  };

  const handleFollow = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push(`/login?redirect=/tipsters/${username}`);
      return;
    }
    setFollowLoading(true);
    try {
      const isFollowing = profile?.is_following;
      const res = await fetch(`${getApiUrl()}/tipsters/${encodeURIComponent(username)}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok && profile) {
        try { (await import('@/lib/analytics')).trackEvent(isFollowing ? 'unfollowed_tipster' : 'followed_tipster', { username }, token); } catch { /* noop */ }
        setProfile({ ...profile, is_following: !isFollowing });
        showSuccess(isFollowing ? t('tipster.toast_unfollowed') : t('tipster.toast_following'));
      }
    } finally {
      setFollowLoading(false);
    }
  };

  const purchase = async (id: number) => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push(`/login?redirect=/tipsters/${username}`);
      return;
    }
    const coupon = profile?.marketplace_coupons?.find((c) => c.id === id);
    if (!coupon) return;
    if (coupon.price > 0 && (walletBalance === null || walletBalance < coupon.price)) {
      showError(new Error(`Insufficient funds.`));
      return;
    }
    setPurchasing(id);
    try {
      const res = await fetch(`${getApiUrl()}/accumulators/${id}/purchase`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const purchased = await res.json().catch(() => null);
        try { (await import('@/lib/analytics')).trackEvent('coupon_purchased', { couponId: id, tipsterUsername: username }, token); } catch { /* noop */ }
        showSuccess(t('tipster.toast_pick_purchased'));
        setPurchasedIds((prev) => new Set([...Array.from(prev), id]));
        const walletRes = await fetch(`${getApiUrl()}/wallet/balance`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (walletRes.ok) {
          const data = await walletRes.json();
          setWalletBalance(Number(data.balance));
        }
        const fullPicks =
          purchased &&
          typeof purchased === 'object' &&
          Array.isArray((purchased as { picks?: unknown }).picks)
            ? (purchased as { picks: MarketplaceCoupon['picks'] }).picks
            : null;
        if (fullPicks) {
          setProfile((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              marketplace_coupons: prev.marketplace_coupons.map((c) =>
                c.id === id ? { ...c, picks: fullPicks } : c,
              ),
            };
          });
        }
        setUnveilCouponId(id);
      } else {
        const err = await res.json().catch(() => ({}));
        showError(new Error(getApiErrorMessage(err, 'Purchase failed')));
      }
    } catch (e: any) {
      showError(e);
    } finally {
      setPurchasing(null);
    }
  };

  // Hooks must be called unconditionally before any early return
  const marketplaceCoupons = useMemo(() => profile?.marketplace_coupons ?? [], [profile?.marketplace_coupons]);
  const archivedCoupons = useMemo(() => profile?.archived_coupons ?? [], [profile?.archived_coupons]);

  const availableSports = useMemo(() => {
    const allCoupons = [...marketplaceCoupons, ...archivedCoupons];
    const sportSet = new Set<string>();
    allCoupons.forEach((c) => { if (c.sport) sportSet.add(c.sport); });
    return Array.from(sportSet).sort();
  }, [marketplaceCoupons, archivedCoupons]);

  const filteredActive = useMemo(() => {
    if (sportFilter === 'all') return marketplaceCoupons;
    return marketplaceCoupons.filter((c) => c.sport === sportFilter);
  }, [marketplaceCoupons, sportFilter]);

  const filteredArchive = useMemo(() => {
    if (sportFilter === 'all') return archivedCoupons;
    return archivedCoupons.filter((c) => c.sport === sportFilter);
  }, [archivedCoupons, sportFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
        <UnifiedHeader />
        <main className="section-ux-page w-full min-w-0">
          <LoadingSkeleton count={3} className="space-y-6" />
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
        <UnifiedHeader />
        <main className="section-ux-page w-full min-w-0">
          <EmptyState
            title={t('tipster.not_found')}
            description={t('tipster.not_found_sub')}
            actionLabel={t('tipster.browse_tipsters')}
            actionHref="/tipsters"
          />
        </main>
      </div>
    );
  }

  const SPORT_META: Record<string, { icon: string; label: string }> = {
    Football:          { icon: '⚽', label: 'Football' },
    Basketball:        { icon: '🏀', label: 'Basketball' },
    Rugby:             { icon: '🏉', label: 'Rugby' },
    MMA:               { icon: '🥊', label: 'MMA' },
    Volleyball:        { icon: '🏐', label: 'Volleyball' },
    Hockey:            { icon: '🏒', label: 'Hockey' },
    'American Football': { icon: '🏈', label: 'American Football' },
    Tennis:            { icon: '🎾', label: 'Tennis' },
    'Multi-Sport':     { icon: '🌍', label: 'Multi-Sport' },
  };

  const { tipster, marketplace_coupons, archived_coupons = [], is_following } = profile;

  const hasSettledPicks = (tipster.total_wins ?? 0) + (tipster.total_losses ?? 0) > 0;
  const roiDisplay = hasSettledPicks ? `${Number(tipster.roi).toFixed(2)}%` : '—';
  const winRateDisplay = hasSettledPicks ? `${Number(tipster.win_rate).toFixed(1)}%` : '—';
  const roiColor = tipster.roi > 0 ? 'text-emerald-600' : tipster.roi < 0 ? 'text-red-600' : 'text-[var(--text)]';
  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <PersonJsonLd
        username={tipster.username}
        displayName={tipster.display_name}
        avatarUrl={tipster.avatar_url}
        bio={tipster.bio}
        winRate={(allTimeTipsterForLdRef.current ?? tipster).win_rate}
        totalPredictions={(allTimeTipsterForLdRef.current ?? tipster).total_predictions}
      />
      {toastError ? <ErrorToast error={toastError} onClose={clearError} /> : null}
      {toastSuccess ? <SuccessToast message={toastSuccess} onClose={clearSuccess} /> : null}
      <UnifiedHeader />
      <main className="dashboard-bg dashboard-pattern min-h-[calc(100vh-8rem)] w-full min-w-0">
        <div className="section-ux-page w-full min-w-0">
          <Link href="/tipsters" className="text-sm text-[var(--primary)] hover:underline mb-4 inline-block">
            {t('tipster.back_to_tipsters')}
          </Link>

          <div className="mb-6">
            <AdSlot zoneSlug="tipster-profile-full" fullWidth className="w-full max-w-3xl" />
          </div>

          <div className="rounded-2xl p-6 md:p-8 mb-8 bg-gradient-to-br from-emerald-50 via-green-50/90 to-teal-50 dark:from-emerald-900/20 dark:via-green-900/15 dark:to-teal-900/20 border border-emerald-200/60 dark:border-emerald-700/40 shadow-lg shadow-emerald-500/5 min-w-0 max-w-full overflow-x-hidden">
            <div className="flex flex-col sm:flex-row gap-6 items-start min-w-0">
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-white dark:bg-gray-800 border-2 border-emerald-200 dark:border-emerald-600 shadow-md">
                {tipster.avatar_url && !avatarError ? (
                  <Image
                    src={getAvatarUrl(tipster.avatar_url, 80)!}
                    alt={tipster.display_name}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                    unoptimized={shouldUnoptimizeGoogleAvatar(getAvatarUrl(tipster.avatar_url, 80))}
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-[var(--primary)] bg-[var(--primary-light)]">
                    {tipster.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleFollow}
                disabled={followLoading}
                className={`w-full sm:w-auto px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                  is_following
                    ? 'bg-[var(--border)] text-[var(--text-muted)] hover:bg-gray-300 dark:hover:bg-gray-600'
                    : 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]'
                }`}
              >
                {followLoading ? '...' : is_following ? t('tipster.following') : t('tipster.follow')}
              </button>
            </div>
              <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2 min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold text-[var(--text)] min-w-0 break-words">{tipster.display_name}</h1>
                {tipster.is_ai ? <AiTipsterBadge /> : null}
                <span className="text-sm font-medium text-[var(--text-muted)] shrink-0">@{tipster.username}</span>
                {tipster.leaderboard_rank != null && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    title={t('tipster.leaderboard_rank_title')}
                  >
                    🏆 {t('tipster.rank_prefix')}{tipster.leaderboard_rank}
                  </span>
                )}
                <FollowersCountButton
                  count={tipster.follower_count ?? 0}
                  tipsterUsername={tipster.username}
                  tipsterDisplayName={tipster.display_name}
                  className="text-sm text-[var(--text-muted)]"
                  onFollowersMutate={refetchProfile}
                />
              </div>
              {/* Sport specialization badges */}
              {availableSports.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {availableSports.map((s) => {
                    const meta = SPORT_META[s];
                    if (!meta) return null;
                    return (
                      <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-700/40">
                        {meta.icon} {meta.label}
                      </span>
                    );
                  })}
                </div>
              )}
              {tipster.bio && <p className="text-[var(--text-muted)] mb-4">{tipster.bio}</p>}
              <div className="mb-4 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
                  {t('tipster.performance_period_label')}
                </p>
                <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-white/60 dark:bg-gray-800/60 border border-emerald-100/80 dark:border-emerald-800/50">
                  {TIPSTER_PERFORMANCE_OPTIONS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setPostedRange(null);
                        setPerformancePeriod(key);
                      }}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                        !postedRange && performancePeriod === key
                          ? 'bg-[var(--primary)] text-white shadow-sm'
                          : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                      }`}
                    >
                      {t(TIPSTER_PERFORMANCE_LABELS[key])}
                    </button>
                  ))}
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mt-4 mb-2">
                  {t('tipster.posted_date_filter_label')}
                </p>
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 p-3 rounded-xl bg-white/60 dark:bg-gray-800/60 border border-emerald-100/80 dark:border-emerald-800/50">
                  <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)] shrink-0">
                    <span>{t('tipster.date_from')}</span>
                    <input
                      type="date"
                      value={dateFromDraft}
                      onChange={(e) => setDateFromDraft(e.target.value)}
                      className="rounded-lg border border-emerald-200/80 dark:border-emerald-700/50 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm text-[var(--text)]"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)] shrink-0">
                    <span>{t('tipster.date_to')}</span>
                    <input
                      type="date"
                      value={dateToDraft}
                      onChange={(e) => setDateToDraft(e.target.value)}
                      className="rounded-lg border border-emerald-200/80 dark:border-emerald-700/50 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm text-[var(--text)]"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!dateFromDraft || !dateToDraft) {
                          showError(new Error(t('tipster.posted_date_both_required')));
                          return;
                        }
                        if (dateFromDraft > dateToDraft) {
                          showError(new Error(t('tipster.posted_date_invalid_order')));
                          return;
                        }
                        const a = new Date(`${dateFromDraft}T12:00:00Z`);
                        const b = new Date(`${dateToDraft}T12:00:00Z`);
                        const span = Math.floor((b.getTime() - a.getTime()) / 86400000) + 1;
                        if (span > 366) {
                          showError(new Error(t('tipster.posted_date_max_span')));
                          return;
                        }
                        setPostedRange({ from: dateFromDraft, to: dateToDraft });
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
                    >
                      {t('tipster.posted_date_apply')}
                    </button>
                    {postedRange ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPostedRange(null);
                          setPerformancePeriod('all');
                        }}
                        className="px-4 py-2 rounded-lg text-sm font-medium border border-emerald-200 dark:border-emerald-700 text-[var(--text)] hover:bg-white/80 dark:hover:bg-gray-700/50"
                      >
                        {t('tipster.posted_date_clear')}
                      </button>
                    ) : null}
                  </div>
                </div>
                {postedRange ? (
                  <p className="text-[10px] text-[var(--text-muted)] mt-2 opacity-90">
                    {t('tipster.performance_posted_hint', { from: postedRange.from, to: postedRange.to })}
                  </p>
                ) : performancePeriod !== 'all' ? (
                  <p className="text-[10px] text-[var(--text-muted)] mt-2 opacity-90">{t('tipster.performance_settled_hint')}</p>
                ) : null}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-4 min-w-0">
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-lg p-3 border border-emerald-100 dark:border-emerald-800/50 shadow-sm">
                  <span className="text-xs uppercase text-[var(--text-muted)]">{t('tipster.roi')}</span>
                  <p className={`font-semibold text-base ${roiColor}`} title={!hasSettledPicks && tipster.total_predictions ? t('tipster.stats_update') : undefined}>{roiDisplay}</p>
                </div>
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-lg p-3 border border-emerald-100 dark:border-emerald-800/50 shadow-sm">
                  <span className="text-xs uppercase text-[var(--text-muted)]">{t('tipster.win_rate')}</span>
                  <p className="font-semibold text-base text-[var(--text)]" title={!hasSettledPicks && tipster.total_predictions ? t('tipster.stats_update') : undefined}>{winRateDisplay}</p>
                </div>
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-lg p-3 border border-emerald-100 dark:border-emerald-800/50 shadow-sm">
                  <span className="text-xs uppercase text-[var(--text-muted)]">{t('tipster.won_lost')}</span>
                  <p className="font-semibold text-base text-[var(--text)]">
                    {tipster.total_wins}W / {tipster.total_losses}L
                  </p>
                </div>
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-lg p-3 border border-emerald-100 dark:border-emerald-800/50 shadow-sm">
                  <span className="text-xs uppercase text-[var(--text-muted)]">{t('tipster.best_streak')}</span>
                  <p className="font-semibold text-base text-[var(--text)]">
                    {tipster.best_streak != null && tipster.best_streak > 0
                      ? `🔥 ${tipster.best_streak}W`
                      : '—'}
                  </p>
                </div>
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-lg p-3 border border-emerald-100 dark:border-emerald-800/50 shadow-sm">
                  <span className="text-xs uppercase text-[var(--text-muted)]">{t('tipster.predictions')}</span>
                  <p className="font-semibold text-base text-[var(--text)]">{tipster.total_predictions}</p>
                </div>
                {tipster.avg_odds != null && Number(tipster.avg_odds) > 0 && (
                  <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-lg p-3 border border-emerald-100 dark:border-emerald-800/50 shadow-sm">
                    <span className="text-xs uppercase text-[var(--text-muted)]">{t('tipster.avg_odds')}</span>
                    <p className="font-semibold text-base text-[var(--text)]">{Number(tipster.avg_odds).toFixed(2)}</p>
                  </div>
                )}
              </div>
              {/* Buyer rating stars */}
              {reviewSummary && reviewSummary.total > 0 && (
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="flex">
                    {[1,2,3,4,5].map((s) => (
                      <span key={s} className={`text-base ${s <= Math.round(reviewSummary.avg) ? 'text-amber-400' : 'text-gray-300'}`}>★</span>
                    ))}
                  </span>
                  <span className="text-sm font-semibold text-amber-500">{reviewSummary.avg}</span>
                  <span className="text-xs text-[var(--text-muted)]">({reviewSummary.total} {reviewSummary.total !== 1 ? t('tipster.reviews') : t('tipster.review')})</span>
                </div>
              )}
              {/* Platform fee transparency note */}
              <p className="text-[10px] text-[var(--text-muted)] mt-1 opacity-70">
                🏛 {t('tipster.commission_note_full')} <Link href="/resources" className="underline hover:text-[var(--primary)]">{t('tipster.learn_more')}</Link>
              </p>
            </div>
          </div>
        </div>

        {subscriptionPackages.length > 0 && (
          <section className="section-ux-gutter mb-10">
            <h2 className="text-lg font-semibold text-[var(--text)] mb-4">{t('tipster.subscription_packages')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subscriptionPackages.map((pkg) => {
                const isSubscribed = subscribedPackageIds.has(pkg.id);
                const needsTopUp = isAuthed && pkg.price > 0 && walletBalance !== null && walletBalance < pkg.price;
                const hasCommittedRoi = pkg.roiGuaranteeEnabled && pkg.roiGuaranteeMin != null;
                const committedRoiValue =
                  pkg.roiGuaranteeMin != null ? `${Number(pkg.roiGuaranteeMin).toFixed(1)}%` : '—';
                return (
                  <div
                    key={pkg.id}
                    className="rounded-xl p-5 border border-emerald-200/60 dark:border-emerald-700/40 bg-gradient-to-br from-emerald-50/80 to-teal-50/60 dark:from-emerald-900/20 dark:to-teal-900/20 shadow-sm"
                  >
                    <h3 className="font-semibold text-[var(--text)] mb-1">{pkg.name}</h3>
                    <p className="text-lg font-semibold text-[var(--primary)] mb-2">GHS {Number(pkg.price).toFixed(2)}<span className="text-sm font-normal text-[var(--text-muted)]">/{pkg.durationDays}d</span></p>
                    <div className="mb-3 rounded-lg border border-emerald-200/60 dark:border-emerald-700/40 bg-white/70 dark:bg-gray-900/30 px-3 py-2">
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2 min-w-0">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] min-w-0">
                          {t('subscriptions.roi_guarantee_label')}
                        </span>
                        <span
                          className={`self-start sm:self-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            hasCommittedRoi
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                          }`}
                        >
                          {hasCommittedRoi
                            ? t('subscriptions.roi_commitment_committed')
                            : t('subscriptions.roi_commitment_not_committed')}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text)] mt-1">
                        {hasCommittedRoi
                          ? t('subscriptions.roi_target_delivery', { n: committedRoiValue })
                          : t('subscriptions.roi_target_unpublished')}
                      </p>
                    </div>
                    {isSubscribed ? (
                      <span className="inline-flex px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-sm font-medium">{t('tipster.subscribed')}</span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSubscribe(pkg.id)}
                          disabled={subscribeLoading === pkg.id}
                          className="w-full py-2.5 px-4 rounded-lg font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {subscribeLoading === pkg.id ? '...' : t('tipster.subscribe')}
                        </button>
                        {needsTopUp && (
                          <p className="mt-2 text-xs text-[var(--text-muted)]">
                            {t('tipster.insufficient_balance')}
                          </p>
                        )}
                        {!isAuthed && (
                          <p className="mt-2 text-xs text-[var(--text-muted)]">
                            Log in to continue subscription checkout.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="section-ux-gutter mb-12">
          {/* Active / Archive tabs */}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center mb-3">
            <div className="inline-flex flex-1 min-w-0 w-full sm:w-auto max-w-full p-1 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-emerald-200/60 dark:border-emerald-700/40 shadow-sm">
              <button
                type="button"
                onClick={() => setCouponFilter('active')}
                className={`flex-1 min-w-0 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  couponFilter === 'active'
                    ? 'bg-[var(--primary)] text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {t('tipster.active')}
              </button>
              <button
                type="button"
                onClick={() => setCouponFilter('archive')}
                className={`flex-1 min-w-0 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  couponFilter === 'archive'
                    ? 'bg-[var(--primary)] text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {t('tipster.archive')}
              </button>
            </div>
            <span className="text-sm text-[var(--text-muted)]">
              {couponFilter === 'active'
                ? t('tipster.available', { n: String(filteredActive.length) })
                : t('tipster.settled', { n: String(profile?.archived_settled_count ?? filteredArchive.length) })}
            </span>
          </div>

          {/* Sport filter pills — only shown when tipster has multi-sport picks */}
          {availableSports.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-5">
              <button
                type="button"
                onClick={() => setSportFilter('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  sportFilter === 'all'
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'bg-white/60 dark:bg-gray-800/60 text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
                }`}
              >
                🌐 {t('tipster.all_sports')}
              </button>
              {availableSports.map((s) => {
                const meta = SPORT_META[s];
                if (!meta) return null;
                return (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setSportFilter(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                      sportFilter === s
                        ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                        : 'bg-white/60 dark:bg-gray-800/60 text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
                    }`}
                  >
                    {meta.icon} {meta.label}
                  </button>
                );
              })}
            </div>
          )}

          {couponFilter === 'active' && (
            <>
              {!filteredActive.length ? (
                <p className="text-[var(--text-muted)]">
                  {sportFilter !== 'all'
                    ? t('tipster.no_active_picks_sport', { sport: SPORT_META[sportFilter]?.label ?? sportFilter })
                    : t('tipster.no_active_predictions')}
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-8">
                  {filteredActive.map((a) => {
                    const isPurchased = purchasedIds.has(a.id);
                    const canPurchase =
                      a.price === 0 || (walletBalance !== null && walletBalance >= a.price);
                    return (
                      <PickCard
                        key={a.id}
                        id={a.id}
                        title={a.title}
                        sport={a.sport}
                        totalPicks={a.totalPicks}
                        totalOdds={a.totalOdds}
                        price={a.price}
                        purchaseCount={a.purchaseCount}
                        picks={a.picks || []}
                        tipster={a.tipster}
                        picksRevealed={viewerIsAdmin}
                        isPurchased={isPurchased}
                        canPurchase={canPurchase}
                        walletBalance={walletBalance}
                        onPurchase={() => purchase(a.id)}
                        purchasing={purchasing === a.id}
                        showUnveil={unveilCouponId === a.id}
                        onUnveilClose={() => setUnveilCouponId(null)}
                        createdAt={a.createdAt}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}

          {couponFilter === 'archive' && (
            <>
              {filteredArchive.length === 0 ? (
                <p className="text-[var(--text-muted)]">
                  {sportFilter !== 'all'
                    ? t('tipster.no_settled_picks_sport', { sport: SPORT_META[sportFilter]?.label ?? sportFilter })
                    : t('tipster.no_settled_picks')}
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-8">
                  {filteredArchive.map((a) => (
                    <PickCard
                      key={a.id}
                      id={a.id}
                      title={a.title}
                      sport={a.sport}
                      totalPicks={a.totalPicks}
                      totalOdds={a.totalOdds}
                      price={a.price}
                      purchaseCount={a.purchaseCount}
                      picks={a.picks || []}
                      tipster={a.tipster}
                      status={a.status}
                      result={a.result}
                      isPurchased={false}
                      canPurchase={false}
                      viewOnly
                      walletBalance={walletBalance}
                      onPurchase={() => {}}
                      createdAt={a.createdAt}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>
        </div>
      </main>
    </div>
  );
}
