'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/site-config';
import { parseSellingThresholds } from '@/lib/selling-thresholds';
import { parseDailyCouponQuota, type DailyCouponQuota } from '@/lib/daily-coupon-quota';
import { emitAuthStorageSync } from '@/lib/auth-storage-sync';
import { consumeOAuthSessionToken } from '@/lib/auth-token-storage';
import { mergeSocialCountsIntoList } from '@/lib/pick-card-social';
import type { PickSocialCounts } from '@/components/pick-social/PickSocialBar';
import type { FeedPick, FollowedTipster, Purchase, PurchaseStats, Stats, TipsterStats, User } from './types';

function purchaseStatsFromList(purchasesList: Purchase[]): PurchaseStats {
  const totalSpent = purchasesList.reduce(
    (sum, p) => sum + (p.pick?.result === 'won' ? Number(p.purchasePrice || 0) : 0),
    0,
  );
  const active = purchasesList.filter(
    (p) => p.pick && p.pick.status === 'active' && p.pick.result === 'pending',
  ).length;
  const pendingEscrowAmount = purchasesList.reduce(
    (sum, p) =>
      sum + (p.pick?.status === 'active' && p.pick?.result === 'pending' ? Number(p.purchasePrice || 0) : 0),
    0,
  );
  return { total: purchasesList.length, totalSpent, active, pendingEscrowAmount };
}

export function useDashboardData(loginRedirect = '/dashboard') {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tipsterStats, setTipsterStats] = useState<TipsterStats | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [minimumROI, setMinimumROI] = useState<number | null>(null);
  const [minimumWinRate, setMinimumWinRate] = useState<number | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchaseStats, setPurchaseStats] = useState<PurchaseStats | null>(null);
  const [feedPicks, setFeedPicks] = useState<FeedPick[]>([]);
  const [vipFeedPicks, setVipFeedPicks] = useState<FeedPick[]>([]);
  const [following, setFollowing] = useState<FollowedTipster[]>([]);
  const [feedPurchasing, setFeedPurchasing] = useState<number | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [dailyQuota, setDailyQuota] = useState<DailyCouponQuota | null>(null);

  const runSettlement = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setSettling(true);
    try {
      const res = await fetch(`${getApiUrl()}/admin/settlement/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const eventsFt = data.oddsApiEventsMarkedFt ?? 0;
        const picks = data.picksUpdated ?? 0;
        const tickets = data.ticketsSettled ?? 0;
        const parts = [];
        if (eventsFt > 0) parts.push(`${eventsFt} event(s) marked FT`);
        if (picks > 0) parts.push(`${picks} picks updated`);
        if (tickets > 0) parts.push(`${tickets} tickets settled`);
        alert(parts.length ? `Settlement: ${parts.join(', ')}` : 'Settlement run — no pending items to settle');
      } else alert('Settlement failed');
    } finally {
      setSettling(false);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      let token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token && typeof window !== 'undefined') {
        try {
          const exchanged = await consumeOAuthSessionToken();
          if (exchanged) token = exchanged;
        } catch {
          // Ignore transient session exchange issues and fall back to login redirect.
        }
      }

      if (!token) {
        router.push(`/login?redirect=${encodeURIComponent(loginRedirect)}`);
        setLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const apiUrl = getApiUrl();

      fetch(`${apiUrl}/users/me`, { headers })
        .then((r) => {
          if (r.status === 401) {
            localStorage.removeItem('token');
            emitAuthStorageSync();
            router.push(`/login?redirect=${encodeURIComponent(loginRedirect)}`);
            return Promise.reject(new Error('Unauthorized'));
          }
          return r.ok ? r.json() : Promise.reject();
        })
        .then((u) => {
          if (!u) return;
          setUser(u);
          const isAdmin = u.role === 'admin';
          return Promise.all([
            Promise.resolve(u),
            isAdmin
              ? fetch(`${apiUrl}/admin/stats`, { headers })
                  .then((r) => (r.ok ? r.json() : null))
                  .catch(() => null)
              : Promise.resolve(null),
            fetch(`${apiUrl}/tipster/stats`, { headers })
              .then((r) => (r.ok ? r.json() : null))
              .catch(() => null),
            fetch(`${apiUrl}/wallet/balance`, { headers })
              .then((r) => (r.ok ? r.json() : null))
              .catch(() => null),
            fetch(`${apiUrl}/tipster/selling-thresholds`, { cache: 'no-store' })
              .then((r) => (r.ok ? r.json() : null))
              .catch(() => null)
              .then((th) => parseSellingThresholds(th)),
            fetch(`${apiUrl}/accumulators/purchased`, { headers })
              .then((r) => (r.ok ? r.json() : []))
              .catch(() => []),
            fetch(`${apiUrl}/tipsters/feed?limit=10`, { headers })
              .then((r) => (r.ok ? r.json() : []))
              .catch(() => []),
            fetch(`${apiUrl}/accumulators/subscription-feed?limit=8`, { headers })
              .then((r) => (r.ok ? r.json().then((d: { items?: FeedPick[] }) => d?.items ?? []) : []))
              .catch(() => []),
            fetch(`${apiUrl}/tipsters/me/following`, { headers })
              .then((r) => (r.ok ? r.json() : []))
              .catch(() => []),
            fetch(`${apiUrl}/notifications?limit=50`, { headers })
              .then((r) => (r.ok ? r.json() : []))
              .catch(() => []),
            fetch(`${apiUrl}/accumulators/daily-coupon-quota`, { headers, cache: 'no-store' })
              .then((r) => (r.ok ? r.json() : null))
              .then((j) => parseDailyCouponQuota(j))
              .catch(() => null),
          ]);
        })
        .then((result) => {
          if (!result) return;
          const [u, s, ts, wallet, thresholds, purchasedData, feedData, vipFeedData, followingData, notifData, quota] =
            result;
          if (u.role === 'admin') setStats(s || {});
          setTipsterStats(ts || { totalPicks: 0, wonPicks: 0, lostPicks: 0, winRate: 0, totalEarnings: 0, roi: 0 });
          if (wallet) setWalletBalance(Number(wallet.balance));
          setMinimumROI(thresholds.minimumROI);
          setMinimumWinRate(thresholds.minimumWinRate);
          const purchasesList = Array.isArray(purchasedData) ? purchasedData : [];
          setPurchases(purchasesList);
          setPurchaseStats(purchaseStatsFromList(purchasesList));
          setFeedPicks(Array.isArray(feedData) ? feedData : []);
          setVipFeedPicks(Array.isArray(vipFeedData) ? vipFeedData : []);
          setFollowing(Array.isArray(followingData) ? followingData : []);
          const notifList = Array.isArray(notifData) ? notifData : [];
          setUnreadNotifications(
            notifList.filter((n: { isRead?: boolean; read?: boolean }) => !(n.isRead ?? n.read ?? false)).length,
          );
          setDailyQuota(quota);
        })
        .catch((err) => {
          if (err?.message !== 'Unauthorized') {
            localStorage.removeItem('token');
            emitAuthStorageSync();
            router.push(`/login?redirect=${encodeURIComponent(loginRedirect)}`);
          }
        })
        .finally(() => setLoading(false));
    };

    void initAuth();
  }, [router, loginRedirect]);

  const refreshDashboard = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token || !user) return;
    const headers = { Authorization: `Bearer ${token}` };
    const apiUrl = getApiUrl();
    const isAdmin = user.role === 'admin';
    try {
      const [s, ts, wallet, thresholds, purchasedData, feedData, vipFeedData, followingData, notifData, quota] =
        await Promise.all([
          isAdmin
            ? fetch(`${apiUrl}/admin/stats`, { headers })
                .then((r) => (r.ok ? r.json() : null))
                .catch(() => null)
            : null,
          fetch(`${apiUrl}/tipster/stats`, { headers })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          fetch(`${apiUrl}/wallet/balance`, { headers })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          fetch(`${apiUrl}/tipster/selling-thresholds`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
            .then((th) => parseSellingThresholds(th)),
          fetch(`${apiUrl}/accumulators/purchased`, { headers })
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => []),
          fetch(`${apiUrl}/tipsters/feed?limit=10`, { headers })
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => []),
          fetch(`${apiUrl}/accumulators/subscription-feed?limit=8`, { headers })
            .then((r) => (r.ok ? r.json().then((d: { items?: FeedPick[] }) => d?.items ?? []) : []))
            .catch(() => []),
          fetch(`${apiUrl}/tipsters/me/following`, { headers })
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => []),
          fetch(`${apiUrl}/notifications?limit=50`, { headers })
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => []),
          fetch(`${apiUrl}/accumulators/daily-coupon-quota`, { headers, cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => parseDailyCouponQuota(j))
            .catch(() => null),
        ]);
      if (isAdmin) setStats(s || {});
      setTipsterStats(ts || { totalPicks: 0, wonPicks: 0, lostPicks: 0, winRate: 0, totalEarnings: 0, roi: 0 });
      if (wallet) setWalletBalance(Number(wallet.balance));
      setMinimumROI(thresholds.minimumROI);
      setMinimumWinRate(thresholds.minimumWinRate);
      const purchasesList = Array.isArray(purchasedData) ? purchasedData : [];
      setPurchases(purchasesList);
      setPurchaseStats(purchaseStatsFromList(purchasesList));
      setFeedPicks(Array.isArray(feedData) ? feedData : []);
      setVipFeedPicks(Array.isArray(vipFeedData) ? vipFeedData : []);
      setFollowing(Array.isArray(followingData) ? followingData : []);
      const notifList = Array.isArray(notifData) ? notifData : [];
      setUnreadNotifications(
        notifList.filter((n: { isRead?: boolean; read?: boolean }) => !(n.isRead ?? n.read ?? false)).length,
      );
      setDailyQuota(quota);
    } catch {
      /* noop */
    }
  }, [user]);

  const purchaseFeedPick = async (pick: FeedPick) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setFeedPurchasing(pick.id);
    try {
      const res = await fetch(`${getApiUrl()}/accumulators/${pick.id}/purchase`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const purchased = await res.json().catch(() => null);
        setPurchases((prev) => [
          ...prev,
          {
            id: 0,
            accumulatorId: pick.id,
            purchasePrice: pick.price,
            purchasedAt: new Date().toISOString(),
            pick: {
              id: pick.id,
              title: pick.title,
              totalPicks: pick.totalPicks,
              totalOdds: pick.totalOdds,
              status: pick.status,
              result: pick.result,
            },
          },
        ]);
        const fullPicks =
          purchased && typeof purchased === 'object' && Array.isArray((purchased as { picks?: unknown }).picks)
            ? (purchased as { picks: FeedPick['picks'] }).picks
            : null;
        if (fullPicks) {
          setFeedPicks((prev) => prev.map((row) => (row.id === pick.id ? { ...row, picks: fullPicks } : row)));
        }
        const w = await fetch(`${getApiUrl()}/wallet/balance`, { headers: { Authorization: `Bearer ${token}` } });
        if (w.ok) {
          const d = await w.json();
          setWalletBalance(Number(d.balance));
        }
      }
    } finally {
      setFeedPurchasing(null);
    }
  };

  return {
    user,
    stats,
    tipsterStats,
    walletBalance,
    loading,
    settling,
    minimumROI,
    minimumWinRate,
    purchases,
    purchaseStats,
    feedPicks,
    vipFeedPicks,
    following,
    feedPurchasing,
    unreadNotifications,
    dailyQuota,
    runSettlement,
    refreshDashboard,
    purchaseFeedPick,
    onVipCountsChange: (id: number, counts: PickSocialCounts) =>
      setVipFeedPicks((prev) => mergeSocialCountsIntoList(prev, id, counts)),
    onFeedCountsChange: (id: number, counts: PickSocialCounts) =>
      setFeedPicks((prev) => mergeSocialCountsIntoList(prev, id, counts)),
  };
}
