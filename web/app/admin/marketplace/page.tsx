'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import { PickCard } from '@/components/PickCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:6001';

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

export default function AdminMarketplacePage() {
  const router = useRouter();
  const [picks, setPicks] = useState<Accumulator[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeAll, setIncludeAll] = useState(false);
  const [fixing, setFixing] = useState(false);

  const loadMarketplace = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    setLoading(true);
    const url = `${API_URL}/accumulators/marketplace${includeAll ? '?includeAll=true' : ''}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: { items?: Accumulator[] } | Accumulator[]) => {
        const items = Array.isArray(data) ? data : (data?.items ?? []);
        setPicks(items);
      })
      .catch(() => setPicks([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMarketplace();
  }, [router, includeAll]);

  const handleFixMarketplace = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setFixing(true);
    try {
      const res = await fetch(`${API_URL}/admin/predictions/fix-marketplace`, {
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
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Marketplace</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Same data as user marketplace. Review listings and fix duplicates.{' '}
              <Link href="/marketplace" className="text-[var(--primary)] hover:underline">View as customer →</Link>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={includeAll}
                onChange={(e) => setIncludeAll(e.target.checked)}
                className="rounded border-gray-300"
              />
              Show all (including started/settled)
            </label>
            <button
              onClick={handleFixMarketplace}
              disabled={fixing}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium disabled:opacity-50"
            >
              {fixing ? 'Fixing...' : 'Fix duplicates & titles'}
            </button>
          </div>
        </div>

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
              {includeAll ? 'No active listings found.' : 'No purchasable picks. Try "Show all" to see started/settled coupons.'}
            </p>
          </div>
        )}
        {!loading && picks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {picks.map((a) => (
              <PickCard
                key={a.id}
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
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
