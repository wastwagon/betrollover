'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { AppFooter } from '@/components/AppFooter';
import { PickCard } from '@/components/PickCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/hooks/useToast';
import { ErrorToast } from '@/components/ErrorToast';
import { SuccessToast } from '@/components/SuccessToast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:6001';

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
  totalOdds: number;
  totalPicks: number;
  price: number;
  purchaseCount?: number;
  picks: Pick[];
  tipster?: Tipster | null;
  createdAt?: string;
}

interface TipsterProfile {
  tipster: {
    id: number;
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
    total_profit?: number;
    avg_odds?: number;
  };
  marketplace_coupons: MarketplaceCoupon[];
  is_following: boolean;
}

export default function TipsterProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const [profile, setProfile] = useState<TipsterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [purchasedIds, setPurchasedIds] = useState<Set<number>>(new Set());
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [unveilCouponId, setUnveilCouponId] = useState<number | null>(null);
  const { showError, showSuccess, clearError, clearSuccess, error: toastError, success: toastSuccess } = useToast();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`${API_URL}/tipsters/${encodeURIComponent(username)}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [username]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    Promise.all([
      fetch(`${API_URL}/wallet/balance`, { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch(`${API_URL}/accumulators/purchased`, { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
        r.ok ? r.json() : [],
      ),
    ]).then(([walletData, purchasedData]) => {
      if (walletData) setWalletBalance(Number(walletData.balance));
      if (Array.isArray(purchasedData)) {
        setPurchasedIds(new Set(purchasedData.map((p: any) => p.accumulatorId || p.pick?.id)));
      }
    });
  }, [profile?.marketplace_coupons?.length]);

  const handleFollow = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push(`/login?redirect=/tipsters/${username}`);
      return;
    }
    setFollowLoading(true);
    try {
      const isFollowing = profile?.is_following;
      const res = await fetch(`${API_URL}/tipsters/${encodeURIComponent(username)}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok && profile) {
        setProfile({ ...profile, is_following: !isFollowing });
        showSuccess(isFollowing ? 'Unfollowed' : 'Following! You\'ll see their picks in your feed.');
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
      const res = await fetch(`${API_URL}/accumulators/${id}/purchase`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showSuccess('Coupon purchased! View in My Purchases.');
        setPurchasedIds((prev) => new Set([...Array.from(prev), id]));
        const walletRes = await fetch(`${API_URL}/wallet/balance`, {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <SiteHeader />
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
        <SiteHeader />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <EmptyState
            title="Tipster not found"
            description="This tipster does not exist or has been removed."
            actionLabel="Browse Tipsters"
            actionHref="/tipsters"
          />
        </main>
        <AppFooter />
      </div>
    );
  }

  const { tipster, marketplace_coupons, is_following } = profile;
  const roiColor = tipster.roi > 0 ? 'text-emerald-600' : 'text-red-600';
  const streakDisplay =
    tipster.current_streak > 0
      ? `🔥 ${tipster.current_streak}W`
      : tipster.current_streak < 0
        ? `❄️ ${Math.abs(tipster.current_streak)}L`
        : '—';

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {toastError ? <ErrorToast error={toastError} onClose={clearError} /> : null}
      {toastSuccess ? <SuccessToast message={toastSuccess} onClose={clearSuccess} /> : null}
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <div className="mb-8">
          <Link href="/tipsters" className="text-sm text-[var(--primary)] hover:underline mb-4 inline-block">
            ← Back to Tipsters
          </Link>

          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="flex-shrink-0 w-20 h-20 rounded-full overflow-hidden bg-[var(--card)] border border-[var(--border)]">
              {tipster.avatar_url && !avatarError ? (
                <img
                  src={tipster.avatar_url}
                  alt={tipster.display_name}
                  className="w-full h-full object-cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-[var(--primary)] bg-[var(--primary-light)]">
                  {tipster.display_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-[var(--text)]">{tipster.display_name}</h1>
                {tipster.leaderboard_rank != null && (
                  <span className="text-sm text-[var(--text-muted)]">Rank #{tipster.leaderboard_rank}</span>
                )}
              </div>
              {tipster.bio && <p className="text-[var(--text-muted)] mb-4">{tipster.bio}</p>}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-4">
                <div className="bg-[var(--card)] rounded-lg p-3 border border-[var(--border)]">
                  <span className="text-xs uppercase text-[var(--text-muted)]">ROI</span>
                  <p className={`font-bold text-lg ${roiColor}`}>{Number(tipster.roi).toFixed(2)}%</p>
                </div>
                <div className="bg-[var(--card)] rounded-lg p-3 border border-[var(--border)]">
                  <span className="text-xs uppercase text-[var(--text-muted)]">Win Rate</span>
                  <p className="font-bold text-lg text-[var(--text)]">{Number(tipster.win_rate).toFixed(1)}%</p>
                </div>
                <div className="bg-[var(--card)] rounded-lg p-3 border border-[var(--border)]">
                  <span className="text-xs uppercase text-[var(--text-muted)]">Streak</span>
                  <p className="font-bold text-lg text-[var(--text)]">{streakDisplay}</p>
                </div>
                <div className="bg-[var(--card)] rounded-lg p-3 border border-[var(--border)]">
                  <span className="text-xs uppercase text-[var(--text-muted)]">Won / Lost</span>
                  <p className="font-bold text-lg text-[var(--text)]">
                    {tipster.total_wins}W / {tipster.total_losses}L
                  </p>
                </div>
                <div className="bg-[var(--card)] rounded-lg p-3 border border-[var(--border)]">
                  <span className="text-xs uppercase text-[var(--text-muted)]">Best Streak</span>
                  <p className="font-bold text-lg text-[var(--text)]">
                    {tipster.best_streak != null && tipster.best_streak > 0
                      ? `🔥 ${tipster.best_streak}W`
                      : '—'}
                  </p>
                </div>
                <div className="bg-[var(--card)] rounded-lg p-3 border border-[var(--border)]">
                  <span className="text-xs uppercase text-[var(--text-muted)]">Predictions</span>
                  <p className="font-bold text-lg text-[var(--text)]">{tipster.total_predictions}</p>
                </div>
              </div>
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`px-6 py-2.5 rounded-xl font-semibold transition-colors ${
                  is_following
                    ? 'bg-[var(--border)] text-[var(--text-muted)] hover:bg-gray-300 dark:hover:bg-gray-600'
                    : 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]'
                }`}
              >
                {followLoading ? '...' : is_following ? 'Following' : 'Follow'}
              </button>
            </div>
          </div>
        </div>

        <section>
          <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Predictions</h2>
          {!marketplace_coupons?.length ? (
            <p className="text-[var(--text-muted)]">No predictions yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-8">
              {marketplace_coupons.map((a) => {
                const isPurchased = purchasedIds.has(a.id);
                const canPurchase =
                  a.price === 0 || (walletBalance !== null && walletBalance >= a.price);
                return (
                  <PickCard
                    key={a.id}
                    id={a.id}
                    title={a.title}
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
        </section>
      </main>
      <AppFooter />
    </div>
  );
}
