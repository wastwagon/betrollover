'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardShell } from '@/components/DashboardShell';
import { AdminSidebar } from '@/components/AdminSidebar';
import { PageHeader } from '@/components/PageHeader';

import { getApiUrl } from '@/lib/site-config';
import { PickCard } from '@/components/PickCard';

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
  tipster?: { id: number; displayName: string; username: string; avatarUrl: string | null; winRate: number; totalPicks: number; wonPicks: number; lostPicks: number; rank: number } | null;
  createdAt: string;
}

interface User {
  id: number;
  displayName: string;
  email: string;
  role: string;
}

interface Stats {
  users?: { total: number; tipsters: number };
  wallets?: { count: number; totalBalance: number };
  picks?: { total: number; pending: number; approved: number; activeMarketplace?: number };
  escrow?: { held: number };
  purchases?: { total: number; revenue: number };
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
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tipsterStats, setTipsterStats] = useState<TipsterStats | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [minimumROI, setMinimumROI] = useState<number | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchaseStats, setPurchaseStats] = useState<{
    total: number;
    totalSpent: number;
    active: number;
  } | null>(null);
  const [feedPicks, setFeedPicks] = useState<FeedPick[]>([]);
  const [following, setFollowing] = useState<FollowedTipster[]>([]);
  const [feedPurchasing, setFeedPurchasing] = useState<number | null>(null);

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
      if (res.ok) alert(`Settlement: ${data.picksUpdated ?? 0} picks updated, ${data.ticketsSettled ?? 0} tickets settled`);
      else alert('Settlement failed');
    } finally {
      setSettling(false);
    }
  };

  useEffect(() => {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const tokenFromUrl = params?.get('token') ?? searchParams.get('token');
    if (tokenFromUrl && typeof window !== 'undefined') {
      localStorage.setItem('token', tokenFromUrl);
      window.history.replaceState({}, '', '/dashboard');
    }
    const token = tokenFromUrl || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    if (!token) {
      router.push('/login');
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    const apiUrl = getApiUrl();

    // Check auth first: 401 → clear token and redirect to login immediately (avoids multiple 401s)
    fetch(`${apiUrl}/users/me`, { headers })
      .then((r) => {
        if (r.status === 401) {
          localStorage.removeItem('token');
          router.push('/login');
          return Promise.reject(new Error('Unauthorized'));
        }
        return r.ok ? r.json() : Promise.reject();
      })
      .then((u) => {
        if (!u) return;
        setUser(u);
        return Promise.all([
          Promise.resolve(u),
          fetch(`${apiUrl}/admin/stats`, { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
          fetch(`${apiUrl}/tipster/stats`, { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
          fetch(`${apiUrl}/wallet/balance`, { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
          fetch(`${apiUrl}/admin/settings`, { headers })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
            .then((settings) => settings?.minimumROI !== undefined ? settings.minimumROI : 20.0),
          fetch(`${apiUrl}/accumulators/purchased`, { headers }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
          fetch(`${apiUrl}/tipsters/feed?limit=10`, { headers }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
          fetch(`${apiUrl}/tipsters/me/following`, { headers }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
        ]);
      })
      .then((result) => {
        if (!result) return;
        const [u, s, ts, wallet, minROI, purchasedData, feedData, followingData] = result;
        if (u.role === 'admin') setStats(s || {});
        setTipsterStats(ts || { totalPicks: 0, wonPicks: 0, lostPicks: 0, winRate: 0, totalEarnings: 0, roi: 0 });
        if (wallet) setWalletBalance(Number(wallet.balance));
        setMinimumROI(minROI);
        const purchasesList = Array.isArray(purchasedData) ? purchasedData : [];
        setPurchases(purchasesList.slice(0, 5));
        const totalSpent = purchasesList.reduce((sum: number, p: Purchase) => sum + Number(p.purchasePrice || 0), 0);
        const active = purchasesList.filter((p: Purchase) =>
          p.pick && p.pick.status === 'active' && p.pick.result === 'pending'
        ).length;
        setPurchaseStats({ total: purchasesList.length, totalSpent, active });
        setFeedPicks(Array.isArray(feedData) ? feedData : []);
        setFollowing(Array.isArray(followingData) ? followingData : []);
      })
      .catch((err) => {
        if (err?.message !== 'Unauthorized') {
          localStorage.removeItem('token');
          router.push('/login');
        }
      })
      .finally(() => setLoading(false));
  }, [router, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] relative overflow-hidden">
        <div className="fixed inset-0 bg-gradient-mesh pointer-events-none -z-10" />
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
          <p className="text-[var(--text-muted)] font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  // All users are now tipsters - show tipster stats for everyone
  const isTipster = true;

  if (isAdmin) {
    return (
      <div className="flex min-h-screen bg-[var(--bg)]">
        <AdminSidebar />
        <main className="flex-1 overflow-auto md:ml-56">
          <div className="p-4 md:p-6">
            <h1 className="text-2xl font-bold text-[var(--text)] mb-6">
              Welcome, {user?.displayName || 'Administrator'}!
            </h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard title="Total Users" value={stats?.users?.total ?? 0} icon="👥" />
              <StatCard title="Tipsters" value={stats?.users?.tipsters ?? 0} icon="🎯" />
              <StatCard title="Wallets" value={stats?.wallets?.count ?? 0} icon="💰" />
              <StatCard
                title="Total Balance (GHS)"
                value={stats?.wallets?.totalBalance ?? 0}
                icon="💵"
                format="currency"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard title="Total Picks" value={stats?.picks?.total ?? 0} icon="🎯" />
              <StatCard title="Pending Picks" value={stats?.picks?.pending ?? 0} icon="⏳" />
              <StatCard title="Active Marketplace" value={stats?.picks?.activeMarketplace ?? 0} icon="🛒" />
              <StatCard title="Escrow Held (GHS)" value={stats?.escrow?.held ?? 0} icon="🔒" format="currency" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard title="Total Purchases" value={stats?.purchases?.total ?? 0} icon="🛍️" />
              <StatCard title="Revenue (GHS)" value={stats?.purchases?.revenue ?? 0} icon="💵" format="currency" />
              <StatCard title="Pending Deposits" value={stats?.deposits?.pending ?? 0} icon="💳" />
              <StatCard title="Pending Withdrawals" value={stats?.withdrawals?.pending ?? 0} icon="💸" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[var(--card)] rounded-card shadow-card border border-[var(--border)] p-6">
                <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Quick Actions</h2>
                <div className="space-y-2">
                  <Link
                    href="/admin/users"
                    className="block py-2.5 px-4 rounded-lg bg-[var(--bg)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] font-medium transition-colors"
                  >
                    Manage Users
                  </Link>
                  <Link
                    href="/admin/picks"
                    className="block py-2.5 px-4 rounded-lg bg-[var(--bg)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] font-medium transition-colors"
                  >
                    Approve Picks
                  </Link>
                  <Link
                    href="/admin/marketplace"
                    className="block py-2.5 px-4 rounded-lg bg-[var(--bg)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] font-medium transition-colors"
                  >
                    Marketplace
                  </Link>
                  <Link
                    href="/admin/fixtures"
                    className="block py-2.5 px-4 rounded-lg bg-[var(--bg)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] font-medium transition-colors"
                  >
                    Fixtures
                  </Link>
                  <Link
                    href="/admin/analytics?tab=ai"
                    className="block py-2.5 px-4 rounded-lg bg-[var(--bg)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] font-medium transition-colors"
                  >
                    AI Predictions Dashboard
                  </Link>
                  <button
                    onClick={runSettlement}
                    disabled={settling}
                    className="block w-full py-2.5 px-4 rounded-lg bg-[var(--bg)] hover:bg-[var(--primary-light)] font-medium text-left disabled:opacity-50 transition-colors"
                  >
                    {settling ? 'Settling...' : 'Run Settlement'}
                  </button>
                  <Link
                    href="/admin/settings"
                    className="block py-2.5 px-4 rounded-lg bg-[var(--bg)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] font-medium transition-colors"
                  >
                    Settings
                  </Link>
                </div>
              </div>
              <div className="bg-[var(--card)] rounded-card shadow-card border border-[var(--border)] p-6">
                <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Platform Info</h2>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-[var(--border)]">
                    <dt className="text-[var(--text-muted)]">Role</dt>
                    <dd className="font-medium text-[var(--text)]">{user?.role}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[var(--border)]">
                    <dt className="text-[var(--text-muted)]">Email</dt>
                    <dd className="font-medium text-[var(--text)]">{user?.email}</dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="text-[var(--text-muted)]">Fixtures</dt>
                    <dd className="font-medium">
                      <Link href="/admin/fixtures" className="text-[var(--primary)] hover:underline">
                        View & Sync →
                      </Link>
                    </dd>
                  </div>
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
        <div className="w-full px-4 sm:px-5 md:px-6 lg:px-8 py-5 sm:py-6 md:py-8 pb-24">
          <PageHeader
            label="Tipster Dashboard"
            title={`Welcome back, ${user?.displayName || 'User'}`}
            tagline="Your performance, picks, and earnings at a glance."
          />

          {/* Quick Actions — large touch targets, premium cards */}
          <section className="mb-6 sm:mb-8">
            <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 sm:mb-3 px-0.5">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Link
                href="/dashboard"
                className="group flex items-center gap-4 p-4 sm:p-5 md:p-6 min-h-[72px] sm:min-h-0 rounded-2xl glass-card hover:shadow-lg border-[var(--border)] transition-all duration-200"
              >
                <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-xl sm:text-2xl group-hover:scale-105 transition-transform flex-shrink-0">
                  🏠
                </span>
                <div className="min-w-0">
                  <span className="font-semibold text-[var(--text)] block">Dashboard</span>
                  <span className="text-sm text-[var(--text-muted)]">Your hub</span>
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
                  <span className="font-semibold block text-white">Create Pick</span>
                  <span className="text-sm text-white/85">Share tips & earn</span>
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
                  <span className="font-semibold text-[var(--text)] block">My Picks</span>
                  <span className="text-sm text-[var(--text-muted)]">View & manage</span>
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
                  <span className="font-semibold text-[var(--text)] block">Marketplace</span>
                  <span className="text-sm text-[var(--text-muted)]">Browse picks & coupons</span>
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
                  <span className="font-semibold text-[var(--text)] block">My Purchases</span>
                  <span className="text-sm text-[var(--text-muted)]">
                    {purchaseStats && purchaseStats.total > 0 ? `${purchaseStats.total} total` : 'Your bought picks'}
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
                  <span className="font-semibold text-[var(--text)] block">Profile</span>
                  <span className="text-sm text-[var(--text-muted)]">Your profile</span>
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
                  <span className="font-semibold text-[var(--text)] block">Wallet</span>
                  <span className="text-sm text-[var(--text-muted)]">Balance & transactions</span>
                </div>
              </Link>
            </div>
          </section>

          {/* Performance stats — glass cards, 2 cols mobile → 4 cols desktop */}
          {tipsterStats && (
            <section className="mb-6 sm:mb-8">
              <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 sm:mb-3 px-0.5">Performance</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <StatCard title="ROI" value={tipsterStats.roi} icon="📈" suffix="%" variant="teal" glass index={0} />
                <StatCard title="Win Rate" value={tipsterStats.winRate} icon="📊" suffix="%" variant="emerald" glass index={1} />
                <StatCard title="Total Picks" value={tipsterStats.totalPicks} icon="🎯" variant="amber" glass index={2} />
                <StatCard
                  title="Wallet"
                  value={walletBalance ?? 0}
                  icon="💰"
                  format="currency"
                  variant="teal"
                  link="/wallet"
                  glass
                  index={3}
                />
              </div>
            </section>
          )}

          {/* Feed from Followed Tipsters / Following */}
          <section className="mb-6 sm:mb-8">
              <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 sm:mb-3 px-0.5">Followed Tipsters</h2>
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
                            <img src={t.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
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
                      <p className="text-sm text-[var(--text-muted)] mb-3">Latest picks from tipsters you follow</p>
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
                                    setPurchases((prev) => [...prev, { id: 0, accumulatorId: pick.id, purchasePrice: pick.price, purchasedAt: new Date().toISOString(), pick: { id: pick.id, title: pick.title, totalPicks: pick.totalPicks, totalOdds: pick.totalOdds, status: pick.status, result: pick.result } }]);
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
                        View all in Marketplace →
                      </Link>
                    </div>
                  ) : following.length > 0 ? (
                    <p className="text-[var(--text-muted)] text-sm">No new picks from followed tipsters. <Link href="/tipsters" className="text-[var(--primary)] hover:underline">Follow more tipsters</Link></p>
                  ) : (
                    <p className="text-[var(--text-muted)] text-sm">
                      <Link href="/tipsters" className="text-[var(--primary)] hover:underline font-medium">Follow tipsters</Link> to see their latest picks here.
                    </p>
                  )}
                </div>
              </div>
            </section>

          {/* Purchase Summary */}
          {purchaseStats !== null && (
            <section className="mb-6 sm:mb-8">
              <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 sm:mb-3 px-0.5">Purchase Summary</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                <StatCard title="Purchases" value={purchaseStats.total} icon="🛍️" variant="slate" link="/my-purchases" glass index={4} />
                <StatCard title="Total Spent" value={purchaseStats.totalSpent} icon="💸" format="currency" variant="slate" glass index={5} />
                <StatCard title="Active" value={purchaseStats.active} icon="⏳" variant="slate" glass index={6} />
              </div>
            </section>
          )}

          {/* Earning Badge — premium CTA */}
          {tipsterStats && minimumROI !== null && (
            <section className="mb-6 sm:mb-8">
              <div
                className={`rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-300 shadow-lg ${
                  tipsterStats.roi >= minimumROI
                    ? 'bg-gradient-to-br from-emerald-50 via-white to-teal-50/80 border border-emerald-200/90 shadow-emerald-200/20'
                    : 'bg-gradient-to-br from-amber-50 via-white to-orange-50/60 border border-amber-200/90 shadow-amber-200/20'
                }`}
              >
                <div className="p-5 sm:p-6 md:p-8">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 md:gap-6">
                    <div className="flex items-start gap-4 sm:gap-5 flex-1 min-w-0">
                      <div
                        className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl shadow-md ${
                          tipsterStats.roi >= minimumROI ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                        }`}
                      >
                        {tipsterStats.roi >= minimumROI ? '💰' : '📈'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3
                          className={`text-lg sm:text-xl font-bold mb-1.5 ${
                            tipsterStats.roi >= minimumROI ? 'text-emerald-900' : 'text-amber-900'
                          }`}
                        >
                          {tipsterStats.roi >= minimumROI ? 'You Can Sell Coupons & Earn' : 'Build ROI to Start Earning'}
                        </h3>
                        <p
                          className={`text-sm leading-relaxed ${
                            tipsterStats.roi >= minimumROI ? 'text-emerald-800/90' : 'text-amber-800/90'
                          }`}
                        >
                          {tipsterStats.roi >= minimumROI ? (
                            <>ROI <strong>{tipsterStats.roi.toFixed(2)}%</strong> meets minimum ({minimumROI}%). Sell picks and earn from every purchase.</>
                          ) : (
                            <>Need <strong>{minimumROI}%</strong> ROI. Current: <strong>{tipsterStats.roi.toFixed(2)}%</strong>. Create free picks to unlock earning.</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 sm:flex-nowrap md:flex-shrink-0">
                      {tipsterStats.roi >= minimumROI ? (
                        <>
                          <Link
                            href="/create-pick"
                            className="flex-1 sm:flex-none min-h-[44px] inline-flex items-center justify-center px-5 py-3 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors text-center"
                          >
                            Create Paid Pick
                          </Link>
                          <Link
                            href="/marketplace"
                            className="flex-1 sm:flex-none min-h-[44px] inline-flex items-center justify-center px-5 py-3 rounded-xl font-semibold bg-white text-emerald-700 border-2 border-emerald-600 hover:bg-emerald-50 transition-colors text-center"
                          >
                            Marketplace
                          </Link>
                        </>
                      ) : (
                        <Link
                          href="/create-pick"
                          className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-colors text-center"
                        >
                          Create Free Pick
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Recent Purchases — glass card */}
          <section className="mb-6 sm:mb-8">
            <div className="glass-card rounded-2xl sm:rounded-3xl overflow-hidden">
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-[var(--border)]/80 flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-semibold text-[var(--text)] text-base sm:text-lg">Recent Purchases</h2>
                {purchases.length > 0 && (
                  <Link href="/my-purchases" className="text-sm font-medium text-[var(--primary)] hover:underline">
                    View all
                  </Link>
                )}
              </div>
              <div className="p-4 sm:p-6">
                {purchases.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {purchases.map((purchase) => {
                      if (!purchase.pick) return null;
                      const totalOdds = Number(purchase.pick.totalOdds || 0);
                      const isActive = purchase.pick.status === 'active' && purchase.pick.result === 'pending';
                      return (
                        <Link
                          key={purchase.id}
                          href="/my-purchases"
                          className="flex items-center justify-between gap-3 p-3 sm:p-4 rounded-xl bg-[var(--bg)]/70 hover:bg-teal-50/60 border border-transparent hover:border-teal-200/50 transition-all duration-200"
                        >
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-[var(--text)] truncate text-sm sm:text-base">{purchase.pick.title}</h3>
                            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
                              {purchase.pick.totalPicks} picks · {totalOdds.toFixed(2)} odds
                            </p>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
                              {isActive ? 'Active' : purchase.pick.result === 'won' ? 'Won' : purchase.pick.result === 'lost' ? 'Lost' : purchase.pick.status || '—'}
                            </span>
                            <span className="font-semibold text-[var(--text)] tabular-nums text-sm sm:text-base">
                              GHS {Number(purchase.purchasePrice || 0).toFixed(2)}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 sm:py-12">
                    <p className="text-[var(--text-muted)] mb-4 sm:mb-6">No purchases yet</p>
                    <Link
                      href="/marketplace"
                      className="inline-flex items-center justify-center min-h-[44px] px-5 py-3 rounded-xl font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
                    >
                      Browse Marketplace
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
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg)] flex items-center justify-center"><div className="w-10 h-10 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" /></div>}>
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
}) {
  const display = format === 'currency' ? value.toFixed(2) : value.toString();
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
    ? `glass-card rounded-2xl p-4 sm:p-5 border border-[var(--border)]/60 hover:shadow-lg transition-all duration-200 ${variantStyles[variant]}`
    : `rounded-2xl border border-[var(--border)] p-5 bg-white hover:shadow-lg transition-all duration-200 ${variantStyles[variant]}`;
  const content = (
    <div className={baseCard}>
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-base sm:text-lg flex-shrink-0 ${iconBg[variant]}`}>
          {icon}
        </div>
        <span className="text-xl sm:text-2xl font-bold text-[var(--text)] tabular-nums truncate">{display}{suffix}</span>
      </div>
      <p className="text-xs sm:text-sm font-medium text-[var(--text-muted)] mt-2 sm:mt-3">{title}</p>
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
