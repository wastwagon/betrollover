'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import { PickCard } from '@/components/PickCard';
import { getApiUrl } from '@/lib/site-config';

interface Pick {
  id?: number;
  matchDescription?: string;
  prediction?: string;
  odds?: number;
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

interface Accumulator {
  id: number;
  title: string;
  totalOdds: number;
  totalPicks: number;
  price: number;
  status?: string;
  result?: string;
  purchaseCount?: number;
  picks: Pick[];
  tipster?: Tipster | null;
  createdAt?: string;
}

interface MarketplaceTipster {
  username: string;
  displayName: string;
}

export default function AdminMarketplacePage() {
  const router = useRouter();
  const [picks, setPicks] = useState<Accumulator[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeAll, setIncludeAll] = useState(false);
  const [tipsterUsername, setTipsterUsername] = useState<string>('');
  const [tipsters, setTipsters] = useState<MarketplaceTipster[]>([]);
  const [fixing, setFixing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [diagnostic, setDiagnostic] = useState<{
    activeListings?: number;
    ticketsTotal?: number;
    byResult?: { won: number; lost: number; pending: number; cancelled: number };
    purchasableAfterFilter?: number;
    reason?: string;
  } | null>(null);

  const loadMarketplace = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    setLoading(true);
    const params = new URLSearchParams();
    if (includeAll) params.set('includeAll', 'true');
    if (tipsterUsername) params.set('tipsterUsername', tipsterUsername);
    const url = `${getApiUrl()}/accumulators/marketplace${params.toString() ? `?${params.toString()}` : ''}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: { items?: Accumulator[] } | Accumulator[]) => {
        const items = Array.isArray(data) ? data : (data?.items ?? []);
        setPicks(items);
      })
      .catch(() => setPicks([]))
      .finally(() => setLoading(false));
  };

  const loadTipsters = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${getApiUrl()}/admin/marketplace/tipsters`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setTipsters(Array.isArray(data) ? data : []))
      .catch(() => setTipsters([]));
  };

  useEffect(() => {
    loadMarketplace();
  }, [router, includeAll, tipsterUsername]);

  useEffect(() => {
    loadTipsters();
  }, [router]);

  const loadDiagnostic = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${getApiUrl()}/admin/marketplace/diagnostic`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then(setDiagnostic)
      .catch(() => setDiagnostic(null));
  };

  const handleDeleteCoupon = async (id: number, title: string) => {
    if (!confirm(`Permanently delete coupon "${title}"?\n\nThis will:\n• Refund any pending purchases\n• Remove from tipster stats (ROI, win rate, streak)\n• Cannot be undone`)) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${getApiUrl()}/admin/picks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const msg = data.refundedCount
          ? `Coupon deleted. ${data.refundedCount} purchase(s) refunded. Tipster stats recalculated.`
          : 'Coupon deleted. Tipster stats recalculated.';
        alert(msg);
        loadMarketplace();
      } else {
        alert(data.message || 'Delete failed');
      }
    } catch {
      alert('Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleFixMarketplace = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setFixing(true);
    try {
      const res = await fetch(`${getApiUrl()}/admin/predictions/fix-marketplace`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert(`Fixed: ${data.titlesUpdated ?? 0} titles updated, ${data.duplicatesDeactivated ?? 0} duplicates deactivated.`);
        loadMarketplace();
      } else {
        alert(data.message || 'Fix failed');
      }
    } catch {
      alert('Fix failed');
    } finally {
      setFixing(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 md:ml-56">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Marketplace</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Same data as user marketplace. Review listings and fix duplicates.{' '}
            <Link href="/marketplace" className="text-[var(--primary)] hover:underline">View as customer →</Link>
          </p>
          <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeAll}
                onChange={(e) => setIncludeAll(e.target.checked)}
                className="w-5 h-5 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
              />
              <span className="text-base font-medium text-amber-900 dark:text-amber-100">
                Show all coupons (including started, settled, removed)
              </span>
            </label>
            <span className="text-sm text-amber-800 dark:text-amber-200">
              — Check this to see and delete archived/settled coupons
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by tipster:</label>
            <select
              value={tipsterUsername}
              onChange={(e) => setTipsterUsername(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All tipsters</option>
              {tipsters.map((t) => (
                <option key={t.username} value={t.username}>
                  {t.displayName} (@{t.username})
                </option>
              ))}
            </select>
            {tipsterUsername && (
              <button
                type="button"
                onClick={() => setTipsterUsername('')}
                className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={handleFixMarketplace}
            disabled={fixing}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium disabled:opacity-50"
          >
            {fixing ? 'Fixing...' : 'Fix duplicates & titles'}
          </button>
          <button
            onClick={loadDiagnostic}
            className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium"
          >
            Run diagnostic
          </button>
        </div>

        {diagnostic && (
          <div className="mb-6 p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Marketplace diagnostic</h3>
            <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {JSON.stringify(diagnostic, null, 2)}
            </pre>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {diagnostic.reason === 'All coupons settled (matches finished)'
                ? 'Matches have finished. Generate new predictions for upcoming fixtures.'
                : diagnostic.reason === 'All pending coupons have fixtures that already started'
                  ? 'All pending coupons contain matches that have already kicked off.'
                  : diagnostic.reason}
            </p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border-4 border-red-200 border-t-red-600 animate-spin" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">Loading marketplace...</p>
            </div>
          </div>
        )}
        {!loading && picks.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No picks on marketplace</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {tipsterUsername
                ? `No coupons for this tipster.${includeAll ? '' : ' Try "Show all" to include archived/settled.'}`
                : includeAll
                  ? 'No active listings found.'
                  : 'No purchasable picks. Try "Show all" to see started/settled coupons.'}
            </p>
          </div>
        )}
        {!loading && picks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {picks.map((a) => (
              <div key={a.id} className="relative">
                <PickCard
                  id={a.id}
                  title={a.title}
                  totalPicks={a.totalPicks}
                  totalOdds={a.totalOdds}
                  price={a.price}
                  status={a.status}
                  result={a.result}
                  picks={a.picks || []}
                  purchaseCount={a.purchaseCount}
                  tipster={a.tipster}
                  isPurchased={false}
                  canPurchase={false}
                  viewOnly
                  onPurchase={() => {}}
                  purchasing={false}
                  className="opacity-95"
                  createdAt={a.createdAt}
                />
                <button
                  onClick={() => handleDeleteCoupon(a.id, a.title)}
                  disabled={deletingId === a.id}
                  className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium disabled:opacity-50 z-10 shadow"
                  title="Delete coupon (refunds pending purchases, recalculates tipster stats)"
                >
                  {deletingId === a.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
