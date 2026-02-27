'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { AdSlot } from '@/components/AdSlot';
import { PickCard } from '@/components/PickCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/hooks/useToast';
import { ErrorToast } from '@/components/ErrorToast';
import { SuccessToast } from '@/components/SuccessToast';
import { getApiUrl, getAvatarUrl } from '@/lib/site-config';
import { PersonJsonLd } from '@/components/PersonJsonLd';
import { useT } from '@/context/LanguageContext';

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

interface TipsterProfile {
  tipster: {
    id: number;
    user_id?: number | null;
    username: string;
    display_name: string;
    avatar_url: string | null;
    bio: string | null;
    is_ai: boolean;
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
  is_following: boolean;
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
  const [reviewSummary, setReviewSummary] = useState<{ avg: number; total: number } | null>(null);
  const { showError, showSuccess, clearError, clearSuccess, error: toastError, success: toastSuccess } = useToast();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`${getApiUrl()}/tipsters/${encodeURIComponent(username)}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        setProfile(p);
        if (p?.tipster?.id) {
          fetch(`${getApiUrl()}/reviews/tipster/${p.tipster.id}?limit=5`)
            .then((r) => r.ok ? r.json() : null)
            .then((d) => d && setReviewSummary({ avg: d.avg, total: d.total }))
            .catch(() => {});
        }
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [username]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    Promise.all([
      fetch(`${getApiUrl()}/wallet/balance`, { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch(`${getApiUrl()}/accumulators/purchased`, { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
        r.ok ? r.json() : [],
      ),
    ]).then(([walletData, purchasedData]) => {
      if (walletData) setWalletBalance(Number(walletData.balance));
      if (Array.isArray(purchasedData)) {
        setPurchasedIds(new Set(purchasedData.map((p: any) => p.accumulatorId || p.pick?.id)));
      }
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
    if (!token) {
      router.push(`/login?redirect=/tipsters/${username}`);
      return;
    }
    const pkg = subscriptionPackages.find((p) => p.id === packageId);
    if (!pkg) return;
    if (walletBalance !== null && pkg.price > 0 && walletBalance < pkg.price) {
      showError(new Error(t('tipster.insufficient_balance')));
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
        showError(new Error(err.message || 'Subscribe failed'));
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
        showSuccess(t('tipster.toast_coupon_purchased'));
        setPurchasedIds((prev) => new Set([...Array.from(prev), id]));
        const walletRes = await fetch(`${getApiUrl()}/wallet/balance`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (walletRes.ok) {
          const data = await walletRes.json();
          setWalletBalance(Number(data.balance));
        }
        setUnveilCouponId(id);
      } else {
        const err = await res.json().catch(() => ({}));
        showError(new Error(err.message || 'Purchase failed'));
      }
    } catch (e: any) {
      showError(e);
    } finally {
      setPurchasing(null);
    }
  };

  // Hooks must be called unconditionally before any early return
  const marketplaceCoupons = profile?.marketplace_coupons ?? [];
  const archivedCoupons = profile?.archived_coupons ?? [];

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
      <div className="min-h-screen bg-[var(--bg)]">
        <UnifiedHeader />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <LoadingSkeleton count={3} className="space-y-6" />
        </main>
        <AppFooter />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <UnifiedHeader />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <EmptyState
            title={t('tipster.not_found')}
            description={t('tipster.not_found_sub')}
            actionLabel={t('tipster.browse_tipsters')}
            actionHref="/tipsters"
          />
        </main>
        <AppFooter />
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
    <div className="min-h-screen bg-[var(--bg)]">
      <PersonJsonLd
        username={tipster.username}
        displayName={tipster.display_name}
        avatarUrl={tipster.avatar_url}
        bio={tipster.bio}
        winRate={tipster.win_rate}
        totalPredictions={tipster.total_predictions}
      />
      {toastError ? <ErrorToast error={toastError} onClose={clearError} /> : null}
      {toastSuccess ? <SuccessToast message={toastSuccess} onClose={clearSuccess} /> : null}
      <UnifiedHeader />
      <main className="dashboard-bg dashboard-pattern min-h-[calc(100vh-8rem)]">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
          <Link href="/tipsters" className="text-sm text-[var(--primary)] hover:underline mb-4 inline-block">
            {t('tipster.back_to_tipsters')}
          </Link>

          <div className="mb-6">
            <AdSlot zoneSlug="tipster-profile-full" fullWidth className="w-full max-w-3xl" />
          </div>

          <div className="rounded-2xl p-6 md:p-8 mb-8 bg-gradient-to-br from-emerald-50 via-green-50/90 to-teal-50 dark:from-emerald-900/20 dark:via-green-900/15 dark:to-teal-900/20 border border-emerald-200/60 dark:border-emerald-700/40 shadow-lg shadow-emerald-500/5">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="flex flex-col items-center gap-2 flex-shrink-0">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-white dark:bg-gray-800 border-2 border-emerald-200 dark:border-emerald-600 shadow-md">
                {tipster.avatar_url && !avatarError ? (
                  <Image
                    src={getAvatarUrl(tipster.avatar_url, 80)!}
                    alt={tipster.display_name}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-[var(--primary)] bg-[var(--primary-light)]">
                    {tipster.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                  is_following
                    ? 'bg-[var(--border)] text-[var(--text-muted)] hover:bg-gray-300 dark:hover:bg-gray-600'
                    : 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]'
                }`}
              >
                {followLoading ? '...' : is_following ? t('tipster.following') : t('tipster.follow')}
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-[var(--text)]">{tipster.display_name}</h1>
                {tipster.is_ai && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border border-violet-200 dark:border-violet-700/40">
                    🤖 {t('tipster.ai_tipster')}
                  </span>
                )}
                {tipster.leaderboard_rank != null && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    🏆 {t('tipster.rank_prefix')}{tipster.leaderboard_rank}
                  </span>
                )}
                {tipster.follower_count != null && tipster.follower_count > 0 && (
                  <span className="text-sm text-[var(--text-muted)]">
                    {t(tipster.follower_count === 1 ? 'tipster.x_follower' : 'tipster.x_followers', { n: String(tipster.follower_count) })}
                  </span>
                )}
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-4">
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-lg p-3 border border-emerald-100 dark:border-emerald-800/50 shadow-sm">
                  <span className="text-xs uppercase text-[var(--text-muted)]">{t('tipster.roi')}</span>
                  <p className={`font-bold text-lg ${roiColor}`} title={!hasSettledPicks && tipster.total_predictions ? t('tipster.stats_update') : undefined}>{roiDisplay}</p>
                </div>
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-lg p-3 border border-emerald-100 dark:border-emerald-800/50 shadow-sm">
                  <span className="text-xs uppercase text-[var(--text-muted)]">{t('tipster.win_rate')}</span>
                  <p className="font-bold text-lg text-[var(--text)]" title={!hasSettledPicks && tipster.total_predictions ? t('tipster.stats_update') : undefined}>{winRateDisplay}</p>
                </div>
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-lg p-3 border border-emerald-100 dark:border-emerald-800/50 shadow-sm">
                  <span className="text-xs uppercase text-[var(--text-muted)]">{t('tipster.won_lost')}</span>
                  <p className="font-bold text-lg text-[var(--text)]">
                    {tipster.total_wins}W / {tipster.total_losses}L
                  </p>
                </div>
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-lg p-3 border border-emerald-100 dark:border-emerald-800/50 shadow-sm">
                  <span className="text-xs uppercase text-[var(--text-muted)]">{t('tipster.best_streak')}</span>
                  <p className="font-bold text-lg text-[var(--text)]">
                    {tipster.best_streak != null && tipster.best_streak > 0
                      ? `🔥 ${tipster.best_streak}W`
                      : '—'}
                  </p>
                </div>
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-lg p-3 border border-emerald-100 dark:border-emerald-800/50 shadow-sm">
                  <span className="text-xs uppercase text-[var(--text-muted)]">{t('tipster.predictions')}</span>
                  <p className="font-bold text-lg text-[var(--text)]">{tipster.total_predictions}</p>
                </div>
                {tipster.avg_odds != null && Number(tipster.avg_odds) > 0 && (
                  <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-lg p-3 border border-emerald-100 dark:border-emerald-800/50 shadow-sm">
                    <span className="text-xs uppercase text-[var(--text-muted)]">{t('tipster.avg_odds')}</span>
                    <p className="font-bold text-lg text-[var(--text)]">{Number(tipster.avg_odds).toFixed(2)}</p>
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
          <section className="max-w-6xl mx-auto px-4 mb-10">
            <h2 className="text-lg font-semibold text-[var(--text)] mb-4">{t('tipster.subscription_packages')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subscriptionPackages.map((pkg) => {
                const isSubscribed = subscribedPackageIds.has(pkg.id);
                const canSubscribe = !isSubscribed && (pkg.price === 0 || (walletBalance !== null && walletBalance >= pkg.price));
                return (
                  <div
                    key={pkg.id}
                    className="rounded-xl p-5 border border-emerald-200/60 dark:border-emerald-700/40 bg-gradient-to-br from-emerald-50/80 to-teal-50/60 dark:from-emerald-900/20 dark:to-teal-900/20 shadow-sm"
                  >
                    <h3 className="font-semibold text-[var(--text)] mb-1">{pkg.name}</h3>
                    <p className="text-2xl font-bold text-[var(--primary)] mb-2">GHS {Number(pkg.price).toFixed(2)}<span className="text-sm font-normal text-[var(--text-muted)]">/{pkg.durationDays}d</span></p>
                    {pkg.roiGuaranteeEnabled && pkg.roiGuaranteeMin != null && (
                      <p className="text-xs text-[var(--text-muted)] mb-3">{t('tipster.roi_guarantee', { n: String(pkg.roiGuaranteeMin) })}</p>
                    )}
                    {isSubscribed ? (
                      <span className="inline-flex px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-sm font-medium">{t('tipster.subscribed')}</span>
                    ) : (
                      <button
                        onClick={() => handleSubscribe(pkg.id)}
                        disabled={!canSubscribe || subscribeLoading === pkg.id}
                        className="w-full py-2.5 px-4 rounded-lg font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {subscribeLoading === pkg.id ? '...' : t('tipster.subscribe')}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="max-w-6xl mx-auto px-4 mb-12">
          {/* Active / Archive tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="inline-flex p-1 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-emerald-200/60 dark:border-emerald-700/40 shadow-sm">
              <button
                onClick={() => setCouponFilter('active')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  couponFilter === 'active'
                    ? 'bg-[var(--primary)] text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {t('tipster.active')}
              </button>
              <button
                onClick={() => setCouponFilter('archive')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
                : t('tipster.settled', { n: String(filteredArchive.length) })}
            </span>
          </div>

          {/* Sport filter pills — only shown when tipster has multi-sport coupons */}
          {availableSports.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-5">
              <button
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
                    : t('tipster.no_settled_coupons')}
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
      <AppFooter />
    </div>
  );
}
