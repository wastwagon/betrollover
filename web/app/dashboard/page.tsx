'use client';

import { useEffect, useState, Suspense } from 'react';
import { useT } from '@/context/LanguageContext';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/DashboardShell';
import { AdminSidebar } from '@/components/AdminSidebar';
import { PageHeader } from '@/components/PageHeader';
import { AdSlot } from '@/components/AdSlot';

import { getApiUrl, getAvatarUrl, shouldUnoptimizeGoogleAvatar } from '@/lib/site-config';
import { parseSellingThresholds } from '@/lib/selling-thresholds';
import { parseDailyCouponQuota, formatQuotaResetUtc, type DailyCouponQuota } from '@/lib/daily-coupon-quota';
import { emitAuthStorageSync } from '@/lib/auth-storage-sync';
import { PickCard } from '@/components/PickCard';
import { useCurrency } from '@/context/CurrencyContext';
import { usePendingWithdrawalCount } from '@/hooks/usePendingWithdrawalCount';

interface FollowedTipster {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface FeedPick {
  id: number;
  title: string;
  totalPicks: number;
  totalOdds: number;
  price: number;
  purchaseCount: number;
  status: string;
  result: string;
  picks: Array<{ matchDescription?: string; prediction?: string; odds?: number; matchDate?: string }>;
  tipster?: {
    id: number;
    displayName: string;
    username: string;
    avatarUrl: string | null;
    winRate: number;
    totalPicks: number;
    wonPicks: number;
    lostPicks: number;
    rank: number | null;
    isAi?: boolean;
  } | null;
  createdAt: string;
  /** From API when viewer may see legs (purchase, subscription, free, settled, etc.). */
  picksRevealed?: boolean;
}

interface User {
  id: number;
  username: string;
  displayName: string;
  email: string;
  role: string;
}

interface Stats {
  users?: { total: number; tipsters: number };
  wallets?: { count: number; totalBalance: number };
  picks?: { total: number; pending: number; approved: number; activeMarketplace?: number; liveMarketplace?: number };
  escrow?: { held: number; heldPick?: number; heldSubscription?: number };
  purchases?: {
    total: number;
    revenue: number;
    marketplaceCount?: number;
    marketplaceRevenue?: number;
  };
  deposits?: { total: number; pending: number };
  withdrawals?: { total: number; pending: number };
}

interface TipsterStats {
  totalPicks: number;
  wonPicks: number;
  lostPicks: number;
  winRate: number;
  totalEarnings: number;
  roi: number;
}

interface Purchase {
  id: number;
  accumulatorId: number;
  purchasePrice: number;
  purchasedAt: string;
  pick?: {
    id: number;
    title: string;
    totalPicks: number;
    totalOdds: number;
    status: string;
    result: string;
  };
}

function DashboardContent() {
  const router = useRouter();
  const t = useT();
  const { format } = useCurrency();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tipsterStats, setTipsterStats] = useState<TipsterStats | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [minimumROI, setMinimumROI] = useState<number | null>(null);
  const [minimumWinRate, setMinimumWinRate] = useState<number | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchaseStats, setPurchaseStats] = useState<{
    total: number;
    totalSpent: number;
    active: number;
    /** Purchase prices for picks still pending (escrow held). */
    pendingEscrowAmount: number;
  } | null>(null);
  const [feedPicks, setFeedPicks] = useState<FeedPick[]>([]);
  const [vipFeedPicks, setVipFeedPicks] = useState<FeedPick[]>([]);
  const [following, setFollowing] = useState<FollowedTipster[]>([]);
  const [feedPurchasing, setFeedPurchasing] = useState<number | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [dailyQuota, setDailyQuota] = useState<DailyCouponQuota | null>(null);
  const pendingWithdrawalCount = usePendingWithdrawalCount();

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
      }
      else alert('Settlement failed');
    } finally {
      setSettling(false);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      let token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token && typeof window !== 'undefined') {
        try {
          const sessionRes = await fetch('/api/auth/session-token', { method: 'GET' });
          if (sessionRes.ok) {
            const sessionData = await sessionRes.json().catch(() => ({ token: null }));
            if (typeof sessionData?.token === 'string' && sessionData.token.trim()) {
              const nextToken = sessionData.token.trim();
              token = nextToken;
              localStorage.setItem('token', nextToken);
              emitAuthStorageSync();
            }
          }
        } catch {
          // Ignore transient session exchange issues and fall back to login redirect.
        }
      }

      if (!token) {
        router.push('/login');
        setLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const apiUrl = getApiUrl();

      // Check auth first: 401 → clear token and redirect to login immediately (avoids multiple 401s)
      fetch(`${apiUrl}/users/me`, { headers })
        .then((r) => {
          if (r.status === 401) {
            localStorage.removeItem('token');
            emitAuthStorageSync();
            router.push('/login');
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
            isAdmin ? fetch(`${apiUrl}/admin/stats`, { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(null),
            fetch(`${apiUrl}/tipster/stats`, { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
            fetch(`${apiUrl}/wallet/balance`, { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
            fetch(`${apiUrl}/tipster/selling-thresholds`, { cache: 'no-store' })
              .then((r) => (r.ok ? r.json() : null))
              .catch(() => null)
              .then((th) => parseSellingThresholds(th)),
            fetch(`${apiUrl}/accumulators/purchased`, { headers }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
            fetch(`${apiUrl}/tipsters/feed?limit=10`, { headers }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
            fetch(`${apiUrl}/accumulators/subscription-feed?limit=8`, { headers })
              .then((r) => (r.ok ? r.json().then((d: { items?: FeedPick[] }) => d?.items ?? []) : []))
              .catch(() => []),
            fetch(`${apiUrl}/tipsters/me/following`, { headers }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
            fetch(`${apiUrl}/notifications?limit=50`, { headers }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
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
          /** Money that stayed with the marketplace: winning picks only (lost/void are refunded to wallet). */
          const totalSpent = purchasesList.reduce(
            (sum: number, p: Purchase) =>
              sum + (p.pick?.result === 'won' ? Number(p.purchasePrice || 0) : 0),
            0,
          );
          const active = purchasesList.filter((p: Purchase) =>
            p.pick && p.pick.status === 'active' && p.pick.result === 'pending'
          ).length;
          const pendingEscrowAmount = purchasesList.reduce(
            (sum: number, p: Purchase) =>
              sum +
              (p.pick?.status === 'active' && p.pick?.result === 'pending'
                ? Number(p.purchasePrice || 0)
                : 0),
            0,
          );
          setPurchaseStats({
            total: purchasesList.length,
            totalSpent,
            active,
            pendingEscrowAmount,
          });
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
            router.push('/login');
          }
        })
        .finally(() => setLoading(false));
    };

    void initAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] relative overflow-x-hidden w-full min-w-0 max-w-full">
        <div className="fixed inset-0 bg-gradient-mesh pointer-events-none -z-10" />
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
          <p className="text-[var(--text-muted)] font-medium">{t('dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  // All users are now tipsters - show tipster stats for everyone
  const isTipster = true;

  if (isAdmin) {
    return (
      <div className="flex min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
        <AdminSidebar />
        <main className="admin-main-sibling section-ux-admin-shell min-w-0">
          <div className="px-4 pb-8 pt-4 md:p-6 max-w-[1600px] mx-auto w-full min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)] mb-4 sm:mb-6 break-words">
              Welcome, {user?.displayName || 'Administrator'}!
            </h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
              <StatCard
                title="Member accounts"
                hint="Users with role user or tipster (excludes admins)."
                value={stats?.users?.total ?? 0}
                icon="👥"
              />
              <StatCard
                title="Active tipster profiles"
                hint="tipsters.is_active — matches public homepage count."
                value={stats?.users?.tipsters ?? 0}
                icon="🎯"
              />
              <StatCard title="Wallets" value={stats?.wallets?.count ?? 0} icon="💰" />
              <StatCard
                title="Total Balance (GHS)"
                value={stats?.wallets?.totalBalance ?? 0}
                icon="💵"
                format="currency"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
              <StatCard
                title={t('admin.stats_all_coupons_title')}
                hint={t('admin.stats_all_coupons_hint')}
                value={stats?.picks?.total ?? 0}
                icon="📋"
              />
              <StatCard
                title={t('admin.stats_marketplace_buyable_title')}
                hint={t('admin.stats_marketplace_buyable_hint')}
                value={stats?.picks?.liveMarketplace ?? 0}
                icon="🎫"
              />
              <StatCard
                title={t('admin.stats_marketplace_active_title')}
                hint={t('admin.stats_marketplace_active_hint')}
                value={stats?.picks?.activeMarketplace ?? 0}
                icon="🛒"
              />
              <StatCard title="Escrow Held (GHS)" value={stats?.escrow?.held ?? 0} icon="🔒" format="currency" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
              <StatCard
                title="Total purchases"
                hint="All pick checkouts (includes non-marketplace paths)."
                value={stats?.purchases?.total ?? 0}
                icon="🛍️"
              />
              <StatCard
                title="Gross purchase revenue"
                hint="Sum of purchase prices (not platform commission or net tipster pay)."
                value={stats?.purchases?.revenue ?? 0}
                icon="💵"
                format="currency"
              />
              <StatCard
                title="Marketplace purchases"
                hint="Joined to pick_marketplace — aligns with public homepage."
                value={stats?.purchases?.marketplaceCount ?? 0}
                icon="🛒"
              />
              <StatCard
                title="Marketplace revenue (GHS)"
                hint="Gross spend on marketplace-listed picks only."
                value={stats?.purchases?.marketplaceRevenue ?? 0}
                icon="📊"
                format="currency"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
              <StatCard title="Pending Deposits" value={stats?.deposits?.pending ?? 0} icon="💳" />
              <StatCard
                title="Pending Withdrawals"
                value={stats?.withdrawals?.pending ?? 0}
                icon="💸"
                link="/admin/withdrawals"
              />
            </div>

            {/* Sports Overview */}
            <div className="mb-6 sm:mb-8 bg-[var(--card)] rounded-card shadow-card border border-[var(--border)] p-4 sm:p-6 min-w-0">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4 min-w-0 sm:gap-3">
                <h2 className="text-base sm:text-lg font-semibold text-[var(--text)]">Sports Overview</h2>
                <span className="inline-flex w-fit items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-300">
                  🌍 Multi-Sport Expansion
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 max-w-xl min-w-0">
                {[
                  { icon: '⚽', sport: 'Football' },
                  { icon: '🏀', sport: 'Basketball' },
                  { icon: '🎾', sport: 'Tennis' },
                ].map(({ icon, sport }) => (
                  <div
                    key={sport}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center bg-emerald-50 border-emerald-200"
                  >
                    <span className="text-2xl">{icon}</span>
                    <span className="text-xs font-semibold text-[var(--text)]">{sport}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-3">
                Core sports: Football, Basketball, Tennis. Additional sports (Rugby, MMA, Volleyball, Hockey, American
                Football, etc.) may still appear in fixtures and marketplace where sync is configured.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Quick Actions — single column on narrow phones for readability */}
              <div className="bg-[var(--card)] rounded-card shadow-card border border-[var(--border)] p-4 sm:p-6 min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-[var(--text)] mb-3 sm:mb-4">{t("dashboard.quick_actions")}</h2>
                <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-1.5">
                  {[
                    { href: '/admin/users',          icon: '👥', label: 'Users' },
                    { href: '/admin/marketplace',     icon: '🛒', label: 'Marketplace' },
                    { href: '/admin/purchases',       icon: '🛍️', label: 'Purchases' },
                    { href: '/admin/deposits',        icon: '💳', label: 'Deposits' },
                    { href: '/admin/withdrawals',     icon: '💸', label: 'Withdrawals' },
                    { href: '/admin/escrow',          icon: '🔒', label: 'Escrow' },
                    { href: '/admin/wallet',          icon: '💰', label: 'Wallet' },
                    { href: '/admin/fixtures',        icon: '⚽', label: 'Fixtures' },
                    { href: '/admin/sports',          icon: '🌍', label: 'Multi-Sport Sync' },
                    { href: '/admin/analytics',       icon: '📈', label: 'Analytics' },
                    { href: '/admin/analytics?tab=sports', icon: '🌍', label: 'Sports Analytics' },
                    { href: '/admin/ai-predictions',  icon: '🤖', label: 'AI Predictions' },
                    { href: '/admin/news',            icon: '📰', label: 'News' },
                    { href: '/admin/content',         icon: '📄', label: 'Content Pages' },
                    { href: '/admin/resources',       icon: '📚', label: 'Resources' },
                    { href: '/admin/notifications',   icon: '🔔', label: 'Notifications' },
                    { href: '/admin/ads',             icon: '📢', label: 'Ads' },
                    { href: '/admin/email',           icon: '📧', label: 'Email Settings' },
                    { href: '/admin/settings',        icon: '⚙️', label: 'Settings' },
                    { href: '/community',             icon: '💬', label: 'Community Chat' },
                    { href: '/admin/chat',            icon: '🛡️', label: 'Chat Moderation' },
                  ].map(({ href, icon, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className="flex items-center gap-2 py-2.5 min-h-[44px] px-3 rounded-lg text-sm bg-[var(--bg)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] font-medium transition-colors active:opacity-90"
                    >
                      <span className="shrink-0">{icon}</span><span className="truncate min-w-0">{label}</span>
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={runSettlement}
                    disabled={settling}
                    className="flex items-center gap-2 py-2.5 min-h-[44px] px-3 rounded-lg text-sm bg-[var(--bg)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] font-medium text-left disabled:opacity-50 transition-colors min-[420px]:col-span-2"
                  >
                    <span>⚡</span><span>{settling ? 'Running Settlement…' : 'Run Settlement Now'}</span>
                  </button>
                </div>
              </div>

              {/* Platform Info */}
              <div className="bg-[var(--card)] rounded-card shadow-card border border-[var(--border)] p-4 sm:p-6 min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-[var(--text)] mb-3 sm:mb-4">Platform Overview</h2>
                <dl className="space-y-0 text-sm divide-y divide-[var(--border)]">
                  {[
                    { label: 'Admin',         value: user?.displayName ?? '—' },
                    { label: 'Email',         value: user?.email ?? '—' },
                    { label: 'Members',   value: stats?.users?.total != null ? `${stats.users.total}` : '—' },
                    { label: 'Active tipsters',      value: stats?.users?.tipsters != null ? `${stats.users.tipsters}` : '—' },
                    {
                      label: 'Active listing rows',
                      value: stats?.picks?.activeMarketplace != null ? `${stats.picks.activeMarketplace}` : '—',
                    },
                    {
                      label: 'Live buyable (homepage)',
                      value: stats?.picks?.liveMarketplace != null ? `${stats.picks.liveMarketplace}` : '—',
                    },
                    {
                      label: 'Escrow Held',
                      value:
                        stats?.escrow?.held != null
                          ? `GHS ${Number(stats.escrow.held).toFixed(2)}${
                              stats.escrow.heldPick != null && stats.escrow.heldSubscription != null
                                ? ` (picks ${Number(stats.escrow.heldPick).toFixed(2)} · VIP ${Number(stats.escrow.heldSubscription).toFixed(2)})`
                                : ''
                            }`
                          : '—',
                    },
                    { label: 'Gross revenue (all purchases)',       value: stats?.purchases?.revenue != null ? `GHS ${Number(stats.purchases.revenue).toFixed(2)}` : '—' },
                    { label: 'Marketplace revenue',       value: stats?.purchases?.marketplaceRevenue != null ? `GHS ${Number(stats.purchases.marketplaceRevenue).toFixed(2)}` : '—' },
                    { label: 'Pending Deposits', value: stats?.deposits?.pending != null ? `${stats.deposits.pending}` : '—', highlight: (stats?.deposits?.pending ?? 0) > 0 },
                    { label: 'Pending Withdrawals', value: stats?.withdrawals?.pending != null ? `${stats.withdrawals.pending}` : '—', highlight: (stats?.withdrawals?.pending ?? 0) > 0 },
                    { label: 'Sports Active',  value: '7 / 7 Live' },
                    { label: 'Multi-Sport Sync', value: undefined, link: { href: '/admin/sports', text: 'View Sync Status →' } },
                    { label: 'Fixtures',       value: undefined, link: { href: '/admin/fixtures', text: 'View & Sync →' } },
                  ].map(({ label, value, link, highlight }) => (
                    <div key={label} className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-baseline py-2.5 sm:py-2 min-w-0 sm:gap-3">
                      <dt className="text-[var(--text-muted)] shrink-0">{label}</dt>
                      <dd className={`font-medium sm:text-right min-w-0 break-words ${highlight ? 'text-amber-600' : 'text-[var(--text)]'}`}>
                        {link ? (
                          <Link href={link.href} className="text-[var(--primary)] hover:underline inline-block">{link.text}</Link>
                        ) : value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <DashboardShell>
      {/* Premium dashboard: mobile-first background and layout */}
      <div className="dashboard-bg dashboard-pattern min-h-[calc(100vh-8rem)] relative">
        <div className="section-ux-dashboard-shell-spacious">
          <PageHeader
            label={t('dashboard.tipster_label')}
            title={`${t('dashboard.welcome')}, ${user?.displayName || 'User'}`}
            tagline={t('dashboard.tagline')}
          />

          <div className="mb-6">
            <AdSlot zoneSlug="dashboard-full" fullWidth className="w-full max-w-3xl" />
          </div>

          {/* Referral CTA — invite friends & earn */}
          <Link
            href="/invite"
            className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4 min-w-0 flex-1">
              <span className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-2xl flex-shrink-0">🎁</span>
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-[var(--text)] block">{t('dashboard.invite')}</span>
                <span className="text-sm text-[var(--text-muted)]">{t('dashboard.card_invite_desc')} — {t('dashboard.invite_cta_short')}</span>
              </div>
            </div>
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex-shrink-0 self-end sm:self-center">→</span>
          </Link>

          {dailyQuota && (
            <div
              className={`mb-4 sm:mb-5 rounded-2xl border px-4 py-3 text-sm ${
                dailyQuota.remaining === 0 && !dailyQuota.exempt && dailyQuota.maxPerDay > 0
                  ? 'border-red-200 bg-red-50/80 text-red-900 dark:border-red-900/50 dark:bg-red-950/25 dark:text-red-100'
                  : 'border-cyan-200/70 bg-cyan-50/40 text-[var(--text)] dark:border-cyan-900/40 dark:bg-cyan-950/15'
              }`}
              role="status"
            >
              {dailyQuota.exempt ? (
                <p className="font-medium">{t('coupon_quota.exempt')}</p>
              ) : dailyQuota.maxPerDay <= 0 ? (
                <p className="font-medium">{t('coupon_quota.unlimited_platform')}</p>
              ) : dailyQuota.remaining === 0 ? (
                <p className="font-medium">
                  {t('coupon_quota.at_limit', {
                    max: String(dailyQuota.maxPerDay),
                    resetTime: formatQuotaResetUtc(dailyQuota.resetsAtUtc) || dailyQuota.resetsAtUtc,
                  })}
                </p>
              ) : (
                <p className="font-medium">
                  {t('coupon_quota.remaining', {
                    remaining: String(dailyQuota.remaining ?? 0),
                    max: String(dailyQuota.maxPerDay),
                    used: String(dailyQuota.usedToday),
                    resetTime: formatQuotaResetUtc(dailyQuota.resetsAtUtc) || dailyQuota.resetsAtUtc,
                  })}
                </p>
              )}
            </div>
          )}

          {/* Quick Actions — large touch targets, premium cards */}
          <section className="mb-6 sm:mb-8">
            <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 sm:mb-3 px-0.5">{t("dashboard.quick_actions")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Link
                href="/dashboard"
                className="group flex items-center gap-4 p-4 sm:p-5 md:p-6 min-h-[72px] sm:min-h-0 rounded-2xl glass-card hover:shadow-lg border-[var(--border)] transition-all duration-200"
              >
                <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-xl sm:text-2xl group-hover:scale-105 transition-transform flex-shrink-0">
                  🏠
                </span>
                <div className="min-w-0">
                  <span className="font-semibold text-[var(--text)] block">{t('dashboard.title')}</span>
                  <span className="text-sm text-[var(--text-muted)]">{t('dashboard.card_hub')}</span>
                </div>
              </Link>
              <Link
                href="/create-pick"
                className="group flex items-center gap-4 p-4 sm:p-5 md:p-6 min-h-[72px] sm:min-h-0 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-700 text-white hover:from-teal-700 hover:to-teal-800 transition-all duration-200 shadow-lg shadow-teal-500/25 hover:shadow-teal-500/30"
              >
                <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/20 flex items-center justify-center text-xl sm:text-2xl group-hover:scale-105 transition-transform flex-shrink-0">
                  ➕
                </span>
                <div className="min-w-0">
                  <span className="font-semibold block text-white">{t('dashboard.create_coupon')}</span>
                  <span className="text-sm text-white/85">{t('dashboard.card_create_desc')}</span>
                </div>
              </Link>
              <Link
                href="/my-picks"
                className="group flex items-center gap-4 p-4 sm:p-5 md:p-6 min-h-[72px] sm:min-h-0 rounded-2xl glass-card hover:shadow-lg border-[var(--border)] transition-all duration-200"
              >
                <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-xl sm:text-2xl group-hover:scale-105 transition-transform flex-shrink-0">
                  🎯
                </span>
                <div className="min-w-0">
                  <span className="font-semibold text-[var(--text)] block">{t('dashboard.my_picks')}</span>
                  <span className="text-sm text-[var(--text-muted)]">{t('dashboard.card_my_picks_desc')}</span>
                </div>
              </Link>
              <Link
                href="/dashboard/subscription-packages"
                className="group flex items-center gap-4 p-4 sm:p-5 md:p-6 min-h-[72px] sm:min-h-0 rounded-2xl glass-card hover:shadow-lg border-[var(--border)] transition-all duration-200"
              >
                <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-xl sm:text-2xl group-hover:scale-105 transition-transform flex-shrink-0">
                  📦
                </span>
                <div className="min-w-0">
                  <span className="font-semibold text-[var(--text)] block">{t('tipster.subscription_packages')}</span>
                  <span className="text-sm text-[var(--text-muted)]">{t('dashboard.card_subscription_desc')}</span>
                </div>
              </Link>
              <Link
                href="/marketplace"
                className="group flex items-center gap-4 p-4 sm:p-5 md:p-6 min-h-[72px] sm:min-h-0 rounded-2xl glass-card hover:shadow-lg border-[var(--border)] transition-all duration-200"
              >
                <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-xl sm:text-2xl group-hover:scale-105 transition-transform flex-shrink-0">
                  🛒
                </span>
                <div className="min-w-0">
                  <span className="font-semibold text-[var(--text)] block">{t('dashboard.marketplace')}</span>
                  <span className="text-sm text-[var(--text-muted)]">{t('dashboard.card_marketplace_desc')}</span>
                </div>
              </Link>
              <Link
                href="/my-purchases"
                className="group flex items-center gap-4 p-4 sm:p-5 md:p-6 min-h-[72px] sm:min-h-0 rounded-2xl glass-card hover:shadow-lg border-[var(--border)] transition-all duration-200"
              >
                <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-xl sm:text-2xl group-hover:scale-105 transition-transform flex-shrink-0">
                  📥
                </span>
                <div className="min-w-0">
                  <span className="font-semibold text-[var(--text)] block">{t('nav.purchases')}</span>
                  <span className="text-sm text-[var(--text-muted)]">
                    {purchaseStats && purchaseStats.total > 0 ? t('dashboard.card_my_purchases_total', { n: String(purchaseStats.total) }) : t('dashboard.card_my_purchases_empty')}
                  </span>
                </div>
              </Link>
              <Link
                href="/profile"
                className="group flex items-center gap-4 p-4 sm:p-5 md:p-6 min-h-[72px] sm:min-h-0 rounded-2xl glass-card hover:shadow-lg border-[var(--border)] transition-all duration-200"
              >
                <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-xl sm:text-2xl group-hover:scale-105 transition-transform flex-shrink-0">
                  👤
                </span>
                <div className="min-w-0">
                  <span className="font-semibold text-[var(--text)] block">{t('dashboard.card_profile')}</span>
                  <span className="text-sm text-[var(--text-muted)]">{t('dashboard.card_profile_desc')}</span>
                </div>
              </Link>
              <Link
                href="/wallet"
                className="group flex items-center gap-4 p-4 sm:p-5 md:p-6 min-h-[72px] sm:min-h-0 rounded-2xl glass-card hover:shadow-lg border-[var(--border)] transition-all duration-200"
              >
                <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-xl sm:text-2xl group-hover:scale-105 transition-transform flex-shrink-0">
                  💰
                </span>
                <div className="min-w-0">
                  <span className="font-semibold text-[var(--text)] block">{t('dashboard.card_wallet')}</span>
                  <span className="text-sm text-[var(--text-muted)]">{t('dashboard.card_wallet_desc')}</span>
                </div>
              </Link>
              <Link
                href="/earnings"
                className="group flex items-center gap-4 p-4 sm:p-5 md:p-6 min-h-[72px] sm:min-h-0 rounded-2xl glass-card hover:shadow-lg border-[var(--border)] transition-all duration-200"
              >
                <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl sm:text-2xl group-hover:scale-105 transition-transform flex-shrink-0">
                  📈
                </span>
                <div className="min-w-0">
                  <span className="font-semibold text-[var(--text)] block">{t('dashboard.card_earnings')}</span>
                  <span className="text-sm text-[var(--text-muted)]">{t('dashboard.card_earnings_desc')}</span>
                </div>
              </Link>
              <Link
                href="/wallet#withdraw"
                className="group flex items-center gap-4 p-4 sm:p-5 md:p-6 min-h-[72px] sm:min-h-0 rounded-2xl glass-card hover:shadow-lg border-[var(--border)] transition-all duration-200"
              >
                <span className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-xl sm:text-2xl group-hover:scale-105 transition-transform flex-shrink-0">
                  💸
                  {pendingWithdrawalCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-[var(--card)]">
                      {pendingWithdrawalCount > 9 ? '9+' : pendingWithdrawalCount}
                    </span>
                  )}
                </span>
                <div className="min-w-0">
                  <span className="font-semibold text-[var(--text)] block">{t('dashboard.card_withdrawals')}</span>
                  <span className="text-sm text-[var(--text-muted)]">
                    {t('dashboard.card_withdrawals_desc')}
                    {pendingWithdrawalCount > 0 && (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        {' · '}
                        {t('dashboard.pending_withdrawal_hint', { n: String(pendingWithdrawalCount) })}
                      </span>
                    )}
                  </span>
                </div>
              </Link>
              <Link
                href="/invite"
                className="group flex items-center gap-4 p-4 sm:p-5 md:p-6 min-h-[72px] sm:min-h-0 rounded-2xl glass-card hover:shadow-lg border-[var(--border)] transition-all duration-200"
              >
                <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl sm:text-2xl group-hover:scale-105 transition-transform flex-shrink-0">
                  🎁
                </span>
                <div className="min-w-0">
                  <span className="font-semibold text-[var(--text)] block">{t('dashboard.invite')}</span>
                  <span className="text-sm text-[var(--text-muted)]">{t('dashboard.card_invite_desc')}</span>
                </div>
              </Link>
              <Link
                href="/support"
                className="group flex items-center gap-4 p-4 sm:p-5 md:p-6 min-h-[72px] sm:min-h-0 rounded-2xl glass-card hover:shadow-lg border-[var(--border)] transition-all duration-200"
              >
                <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center text-xl sm:text-2xl group-hover:scale-105 transition-transform flex-shrink-0">
                  🎫
                </span>
                <div className="min-w-0">
                  <span className="font-semibold text-[var(--text)] block">{t('dashboard.card_support')}</span>
                  <span className="text-sm text-[var(--text-muted)]">{t('dashboard.card_support_desc')}</span>
                </div>
              </Link>
              <Link
                href="/community"
                className="group flex items-center gap-4 p-4 sm:p-5 md:p-6 min-h-[72px] sm:min-h-0 rounded-2xl glass-card hover:shadow-lg border-[var(--border)] transition-all duration-200"
              >
                <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center text-xl sm:text-2xl group-hover:scale-105 transition-transform flex-shrink-0">
                  💬
                </span>
                <div className="min-w-0">
                  <span className="font-semibold text-[var(--text)] block">{t('dashboard.card_community')}</span>
                  <span className="text-sm text-[var(--text-muted)]">{t('dashboard.card_community_desc')}</span>
                </div>
              </Link>
              <Link
                href="/subscriptions"
                className="group flex items-center gap-4 p-4 sm:p-5 md:p-6 min-h-[72px] sm:min-h-0 rounded-2xl glass-card hover:shadow-lg border-[var(--border)] transition-all duration-200"
              >
                <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-xl sm:text-2xl group-hover:scale-105 transition-transform flex-shrink-0">
                  ⭐
                </span>
                <div className="min-w-0">
                  <span className="font-semibold text-[var(--text)] block">{t('dashboard.card_subscriptions')}</span>
                  <span className="text-sm text-[var(--text-muted)]">{t('dashboard.card_subscriptions_desc')}</span>
                </div>
              </Link>
              <Link
                href="/subscriptions/marketplace"
                className="group flex items-center gap-4 p-4 sm:p-5 md:p-6 min-h-[72px] sm:min-h-0 rounded-2xl glass-card hover:shadow-lg border-[var(--border)] transition-all duration-200"
              >
                <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-xl sm:text-2xl group-hover:scale-105 transition-transform flex-shrink-0">
                  💎
                </span>
                <div className="min-w-0">
                  <span className="font-semibold text-[var(--text)] block">{t('dashboard.card_vip_marketplace')}</span>
                  <span className="text-sm text-[var(--text-muted)]">{t('dashboard.card_vip_marketplace_desc')}</span>
                </div>
              </Link>
              <Link
                href="/leaderboard"
                className="group flex items-center gap-4 p-4 sm:p-5 md:p-6 min-h-[72px] sm:min-h-0 rounded-2xl glass-card hover:shadow-lg border-[var(--border)] transition-all duration-200"
              >
                <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-xl sm:text-2xl group-hover:scale-105 transition-transform flex-shrink-0">
                  🏆
                </span>
                <div className="min-w-0">
                  <span className="font-semibold text-[var(--text)] block">{t('dashboard.card_leaderboard')}</span>
                  <span className="text-sm text-[var(--text-muted)]">{t('dashboard.card_leaderboard_desc')}</span>
                </div>
              </Link>
              <Link
                href="/notifications"
                className="group relative flex items-center gap-4 p-4 sm:p-5 md:p-6 min-h-[72px] sm:min-h-0 rounded-2xl glass-card hover:shadow-lg border-[var(--border)] transition-all duration-200"
              >
                <span className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-xl sm:text-2xl group-hover:scale-105 transition-transform flex-shrink-0">
                  🔔
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </span>
                <div className="min-w-0">
                  <span className="font-semibold text-[var(--text)] block">{t('dashboard.card_notifications')}</span>
                  <span className="text-sm text-[var(--text-muted)]">
                    {unreadNotifications > 0 ? t('dashboard.card_notifications_unread', { n: String(unreadNotifications) }) : t('dashboard.card_notifications_none')}
                  </span>
                </div>
              </Link>
              <Link
                href={user?.username ? `/tipsters/${user.username}` : '/tipsters'}
                className="group flex items-center gap-4 p-4 sm:p-5 md:p-6 min-h-[72px] sm:min-h-0 rounded-2xl glass-card hover:shadow-lg border-[var(--border)] transition-all duration-200"
              >
                <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-xl sm:text-2xl group-hover:scale-105 transition-transform flex-shrink-0">
                  🌟
                </span>
                <div className="min-w-0">
                  <span className="font-semibold text-[var(--text)] block">{t('dashboard.card_my_profile')}</span>
                  <span className="text-sm text-[var(--text-muted)]">{t('dashboard.card_my_profile_desc')}</span>
                </div>
              </Link>
            </div>
          </section>

          {/* Multi-Sport Live Banner */}
          <section className="mb-6 sm:mb-8">
            <div className="rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-slate-800 via-teal-900/80 to-slate-800 border border-teal-500/30 shadow-lg">
              <div className="p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-w-0">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="shrink-0 w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-2xl">
                      🌍
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-white text-base sm:text-lg">{t('dashboard.multisport_title')}</h3>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {t('dashboard.multisport_desc')}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:shrink-0 min-w-0">
                    {[
                      { icon: '⚽', label: 'Football' },
                      { icon: '🏀', label: 'Basketball' },
                      { icon: '🎾', label: 'Tennis' },
                    ].map(({ icon, label }) => (
                      <div
                        key={label}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
                      >
                        <span>{icon}</span>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Performance stats — glass cards, 2 cols mobile → 4 cols desktop */}
          {tipsterStats && (
            <section className="mb-6 sm:mb-8">
              <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 sm:mb-3 px-0.5">{t('dashboard.performance')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatCard title={t("dashboard.roi")} value={tipsterStats.roi} icon="📈" suffix="%" variant="teal" glass index={0} />
                <StatCard title={t("dashboard.win_rate")} value={tipsterStats.winRate} icon="📊" suffix="%" variant="emerald" glass index={1} />
                <StatCard title={t("dashboard.total_picks")} value={tipsterStats.totalPicks} icon="🎯" variant="amber" glass index={2} />
                <StatCard
                  title={t('dashboard.card_wallet')}
                  value={walletBalance ?? 0}
                  icon="💰"
                  format="currency"
                  displayValue={format(walletBalance ?? 0).primary}
                  variant="teal"
                  link="/wallet"
                  glass
                  index={3}
                />
              </div>
            </section>
          )}

          {/* VIP subscription picks */}
          {vipFeedPicks.length > 0 && (
            <section className="mb-6 sm:mb-8">
              <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-2 mb-2 sm:mb-3 px-0.5 min-w-0">
                <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  {t('dashboard.vip_picks_section_title')}
                </h2>
                <Link
                  href="/subscriptions"
                  className="text-xs font-medium text-[var(--primary)] hover:underline w-fit"
                >
                  {t('dashboard.vip_picks_see_all')}
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                {vipFeedPicks.slice(0, 4).map((pick) => {
                  const tip = pick.tipster;
                  const tipster = tip
                    ? {
                        id: tip.id ?? 0,
                        displayName: tip.displayName,
                        username: tip.username,
                        avatarUrl: tip.avatarUrl ?? null,
                        isAi: tip.isAi === true,
                        winRate: tip.winRate,
                        totalPicks: tip.totalPicks ?? 0,
                        wonPicks: tip.wonPicks ?? 0,
                        lostPicks: tip.lostPicks ?? 0,
                        rank: tip.rank ?? null,
                      }
                    : null;
                  return (
                    <PickCard
                      key={`vip-${pick.id}`}
                      id={pick.id}
                      title={pick.title}
                      totalPicks={pick.totalPicks}
                      totalOdds={pick.totalOdds}
                      price={pick.price}
                      purchaseCount={pick.purchaseCount}
                      picks={pick.picks || []}
                      tipster={tipster}
                      isPurchased
                      canPurchase={false}
                      walletBalance={null}
                      onPurchase={() => {}}
                      viewOnly
                      purchasing={false}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* Feed from Followed Tipsters / Following */}
          <section className="mb-6 sm:mb-8">
              <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 sm:mb-3 px-0.5">{t('dashboard.followed_tipsters')}</h2>
              <div className="glass-card rounded-2xl sm:rounded-3xl overflow-hidden border border-[var(--border)]/60">
                <div className="p-4 sm:p-6">
                  {following.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {following.map((t) => (
                        <Link
                          key={t.id}
                          href={`/tipsters/${t.username}`}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg)]/70 hover:bg-teal-50/60 border border-[var(--border)]/60 transition-colors"
                        >
                          {t.avatarUrl ? (
                            <Image
                              src={getAvatarUrl(t.avatarUrl, 24)!}
                              alt=""
                              width={24}
                              height={24}
                              className="w-6 h-6 rounded-full object-cover"
                              unoptimized={shouldUnoptimizeGoogleAvatar(getAvatarUrl(t.avatarUrl, 24))}
                            />
                          ) : (
                            <span className="w-6 h-6 rounded-full bg-[var(--primary-light)] flex items-center justify-center text-xs font-bold text-[var(--primary)]">
                              {t.displayName?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          )}
                          <span className="font-medium text-[var(--text)] text-sm">{t.displayName}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                  {feedPicks.length > 0 ? (
                    <div>
                      <p className="text-sm text-[var(--text-muted)] mb-3">{t('dashboard.latest_picks')}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {feedPicks.slice(0, 4).map((pick) => {
                          const isPurchased = purchases.some((p) => p.accumulatorId === pick.id);
                          const canPurchase = pick.price === 0 || (walletBalance !== null && walletBalance >= pick.price);
                          return (
                            <PickCard
                              key={pick.id}
                              id={pick.id}
                              title={pick.title}
                              totalPicks={pick.totalPicks}
                              totalOdds={pick.totalOdds}
                              price={pick.price}
                              purchaseCount={pick.purchaseCount}
                              picks={pick.picks || []}
                              tipster={pick.tipster}
                              picksRevealed={pick.picksRevealed === true}
                              isPurchased={isPurchased}
                              canPurchase={canPurchase}
                              walletBalance={walletBalance}
                              onPurchase={async () => {
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
                                    setPurchases((prev) => [...prev, { id: 0, accumulatorId: pick.id, purchasePrice: pick.price, purchasedAt: new Date().toISOString(), pick: { id: pick.id, title: pick.title, totalPicks: pick.totalPicks, totalOdds: pick.totalOdds, status: pick.status, result: pick.result } }]);
                                    const fullPicks =
                                      purchased &&
                                      typeof purchased === 'object' &&
                                      Array.isArray((purchased as { picks?: unknown }).picks)
                                        ? (purchased as { picks: FeedPick['picks'] }).picks
                                        : null;
                                    if (fullPicks) {
                                      setFeedPicks((prev) =>
                                        prev.map((p) => (p.id === pick.id ? { ...p, picks: fullPicks } : p)),
                                      );
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
                              }}
                              purchasing={feedPurchasing === pick.id}
                            />
                          );
                        })}
                      </div>
                      <Link
                        href="/marketplace"
                        className="inline-block mt-3 text-sm font-medium text-[var(--primary)] hover:underline"
                      >
                        {t('dashboard.view_all_marketplace')}
                      </Link>
                    </div>
                  ) : following.length > 0 ? (
                    <p className="text-[var(--text-muted)] text-sm">{t('dashboard.no_new_picks')} <Link href="/tipsters" className="text-[var(--primary)] hover:underline">{t('dashboard.follow_more')}</Link></p>
                  ) : (
                    <p className="text-[var(--text-muted)] text-sm">
                      <Link href="/tipsters" className="text-[var(--primary)] hover:underline font-medium">{t('dashboard.follow_more')}</Link> {t('dashboard.follow_tipsters')}
                    </p>
                  )}
                </div>
              </div>
            </section>

          {/* Purchase Summary */}
          {purchaseStats !== null && (
            <section className="mb-6 sm:mb-8">
              <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 sm:mb-3 px-0.5">{t('dashboard.purchase_summary')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <StatCard title={t('dashboard.purchases')} value={purchaseStats.total} icon="🛍️" variant="slate" link="/my-purchases" glass index={4} />
                <StatCard
                  title={t('dashboard.total_spent')}
                  value={purchaseStats.totalSpent}
                  icon="💸"
                  format="currency"
                  displayValue={format(purchaseStats.totalSpent).primary}
                  variant="slate"
                  glass
                  index={5}
                  hint={t('dashboard.total_spent_hint')}
                />
                <StatCard title={t('status.active')} value={purchaseStats.active} icon="⏳" variant="slate" glass index={6} />
              </div>
              {purchaseStats.pendingEscrowAmount > 0 && (
                <p className="text-xs text-[var(--text-muted)] mt-3 px-0.5 leading-relaxed">
                  {t('dashboard.pending_escrow_note', {
                    amount: format(purchaseStats.pendingEscrowAmount).primary,
                  })}
                </p>
              )}
            </section>
          )}

          {/* Earning Badge — premium CTA (paid marketplace requires min ROI + min win rate) */}
          {tipsterStats && minimumROI !== null && minimumWinRate !== null && (
            <section className="mb-6 sm:mb-8">
              {(() => {
                const canSellPaid =
                  tipsterStats.roi >= minimumROI && tipsterStats.winRate >= minimumWinRate;
                return (
              <div
                className={`rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-300 shadow-lg ${
                  canSellPaid
                    ? 'bg-gradient-to-br from-emerald-50 via-white to-teal-50/80 border border-emerald-200/90 shadow-emerald-200/20'
                    : 'bg-gradient-to-br from-amber-50 via-white to-orange-50/60 border border-amber-200/90 shadow-amber-200/20'
                }`}
              >
                <div className="p-5 sm:p-6 md:p-8">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 md:gap-6 min-w-0">
                    <div className="flex items-start gap-4 sm:gap-5 flex-1 min-w-0">
                      <div
                        className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl shadow-md ${
                          canSellPaid ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                        }`}
                      >
                        {canSellPaid ? '💰' : '📈'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3
                          className={`text-lg sm:text-xl font-bold mb-1.5 ${
                            canSellPaid ? 'text-emerald-900' : 'text-amber-900'
                          }`}
                        >
                          {canSellPaid ? t('dashboard.earn_ready') : t('dashboard.earn_build_performance')}
                        </h3>
                        <p
                          className={`text-sm leading-relaxed ${
                            canSellPaid ? 'text-emerald-800/90' : 'text-amber-800/90'
                          }`}
                        >
                          {canSellPaid ? (
                            t('dashboard.earn_meets_both', {
                              roi: tipsterStats.roi.toFixed(2),
                              wr: String(tipsterStats.winRate),
                              minRoi: String(minimumROI),
                              minWr: String(minimumWinRate),
                            })
                          ) : (
                            t('dashboard.earn_below_detail', {
                              roi: tipsterStats.roi.toFixed(2),
                              minRoi: String(minimumROI),
                              wr: String(tipsterStats.winRate),
                              minWr: String(minimumWinRate),
                            })
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 sm:flex-nowrap md:shrink-0 min-w-0">
                      {canSellPaid ? (
                        <>
                          <Link
                            href="/create-pick"
                            className="flex-1 sm:flex-none min-h-[44px] inline-flex items-center justify-center px-5 py-3 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors text-center"
                          >
                            {t('dashboard.create_paid_pick')}
                          </Link>
                          <Link
                            href="/marketplace"
                            className="flex-1 sm:flex-none min-h-[44px] inline-flex items-center justify-center px-5 py-3 rounded-xl font-semibold bg-white text-emerald-700 border-2 border-emerald-600 hover:bg-emerald-50 transition-colors text-center"
                          >
                            {t('dashboard.marketplace')}
                          </Link>
                        </>
                      ) : (
                        <Link
                          href="/create-pick"
                          className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-colors text-center"
                        >
                          {t('dashboard.create_free_pick')}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
                );
              })()}
            </section>
          )}

          {/* Recent Purchases — glass card */}
          <section className="mb-6 sm:mb-8">
            <div className="glass-card rounded-2xl sm:rounded-3xl overflow-hidden">
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-[var(--border)]/80 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:flex-wrap min-w-0 sm:gap-3">
                <h2 className="font-semibold text-[var(--text)] text-base sm:text-lg">{t('dashboard.recent_purchases')}</h2>
                {purchases.length > 0 && (
                  <Link href="/my-purchases" className="text-sm font-medium text-[var(--primary)] hover:underline w-fit">
                    {t('dashboard.view_all')}
                  </Link>
                )}
              </div>
              <div className="p-4 sm:p-6">
                {purchases.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {purchases.slice(0, 5).map((purchase) => {
                      if (!purchase.pick) return null;
                      const totalOdds = Number(purchase.pick.totalOdds || 0);
                      const isActive = purchase.pick.status === 'active' && purchase.pick.result === 'pending';
                      return (
                        <Link
                          key={purchase.id}
                          href="/my-purchases"
                          className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 p-3 sm:p-4 rounded-xl bg-[var(--bg)]/70 hover:bg-teal-50/60 border border-transparent hover:border-teal-200/50 transition-all duration-200 min-w-0"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                              {purchase.pick.totalPicks} picks · {totalOdds.toFixed(2)} odds
                            </p>
                          </div>
                          <div className="flex items-center justify-between gap-2 sm:gap-3 shrink-0 sm:justify-end w-full sm:w-auto min-w-0">
                            <span
                              className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                isActive
                                  ? 'bg-teal-100 text-teal-800'
                                  : purchase.pick.result === 'won'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : purchase.pick.result === 'lost'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {isActive ? t('status.active') : purchase.pick.result === 'won' ? t('status.won') : purchase.pick.result === 'lost' ? t('status.lost') : purchase.pick.status || '—'}
                            </span>
                            <span className="font-semibold text-[var(--text)] tabular-nums text-sm sm:text-base">
                              {format(Number(purchase.purchasePrice || 0)).primary}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 sm:py-12">
                    <p className="text-[var(--text-muted)] mb-4 sm:mb-6">{t('my_purchases.no_purchases')}</p>
                    <Link
                      href="/marketplace"
                      className="inline-flex items-center justify-center min-h-[44px] px-5 py-3 rounded-xl font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
                    >
                      {t('my_purchases.browse_marketplace')}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg)] flex items-center justify-center w-full min-w-0 max-w-full overflow-x-hidden"><div className="w-10 h-10 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}

function StatCard({
  title,
  value,
  icon,
  format = 'number',
  suffix = '',
  link,
  variant = 'teal',
  glass = false,
  index = 0,
  displayValue,
  hint,
}: {
  title: string;
  value: number;
  icon: string;
  format?: 'number' | 'currency';
  suffix?: string;
  link?: string;
  variant?: 'teal' | 'emerald' | 'amber' | 'slate';
  glass?: boolean;
  index?: number;
  /** When set (e.g. user currency formatted), shown instead of value. Admin dashboard does not pass this. */
  displayValue?: string;
  /** Short definition for admin clarity (shown under title). */
  hint?: string;
}) {
  const display = displayValue ?? (format === 'currency' ? value.toFixed(2) : value.toString());
  const variantStyles = {
    teal: 'border-l-4 border-l-teal-500',
    emerald: 'border-l-4 border-l-emerald-500',
    amber: 'border-l-4 border-l-amber-500',
    slate: 'border-l-4 border-l-slate-400',
  };
  const iconBg = {
    teal: 'bg-teal-100 text-teal-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    slate: 'bg-slate-100 text-slate-600',
  };
  const baseCard = glass
    ? `glass-card rounded-2xl p-4 sm:p-5 border border-[var(--border)]/60 hover:shadow-lg transition-all duration-200 min-w-0 ${variantStyles[variant]}`
    : `rounded-2xl border border-[var(--border)] p-5 bg-white hover:shadow-lg transition-all duration-200 min-w-0 ${variantStyles[variant]}`;
  const content = (
    <div className={baseCard}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3 min-w-0">
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-base sm:text-lg shrink-0 ${iconBg[variant]}`}>
          {icon}
        </div>
        <span className="text-xl sm:text-2xl font-bold text-[var(--text)] tabular-nums truncate text-left sm:text-right sm:ml-auto">{display}{suffix}</span>
      </div>
      <p className="text-xs sm:text-sm font-medium text-[var(--text-muted)] mt-2 sm:mt-3">{title}</p>
      {hint ? <p className="text-[10px] sm:text-xs text-[var(--text-muted)]/80 mt-1 leading-snug">{hint}</p> : null}
    </div>
  );

  if (link) {
    return (
      <Link href={link} className="block hover:opacity-95 active:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
