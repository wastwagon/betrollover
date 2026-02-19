'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';

import { getApiUrl } from '@/lib/site-config';

interface Pick {
  id: number;
  matchDescription?: string;
  prediction?: string;
  odds?: number;
}

interface Accumulator {
  id: number;
  title: string;
  totalOdds: number;
  totalPicks: number;
  price: number;
  status: string;
  picks: Pick[];
  createdAt: string;
}

export default function AdminPicksPage() {
  const router = useRouter();
  const [picks, setPicks] = useState<Accumulator[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);

  const load = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${getApiUrl()}/admin/picks`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setPicks(Array.isArray(data) ? data : []))
      .catch(() => setPicks([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.push('/login');
      return;
    }
    load();
  }, [router]);

  const approve = async (id: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setActing(id);
    try {
      const res = await fetch(`${getApiUrl()}/admin/picks/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setPicks((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setActing(null);
    }
  };

  const reject = async (id: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setActing(id);
    try {
      const res = await fetch(`${getApiUrl()}/admin/picks/${id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setPicks((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 md:ml-56">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Picks</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Review, approve, or reject tipster picks for marketplace listing.
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border-4 border-red-200 border-t-red-600 animate-spin" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">Loading picks...</p>
            </div>
          </div>
        )}
        {!loading && picks.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No pending picks</h3>
            <p className="text-gray-600 dark:text-gray-400">All picks have been reviewed.</p>
          </div>
        )}
        {!loading && picks.length > 0 && (
          <div className="space-y-4">
            {picks.map((a) => (
              <div key={a.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-xl transition-shadow">
                <div className="flex justify-between items-start gap-6">
                  <div className="flex-1">
                    <h2 className="font-bold text-xl text-gray-900 dark:text-white mb-2">{a.title}</h2>
                    <div className="flex flex-wrap gap-4 mb-4 text-sm">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-medium">
                        {a.totalPicks} picks
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 font-medium">
                        {Number(a.totalOdds).toFixed(2)} odds
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 font-medium">
                        GHS {Number(a.price).toFixed(2)}
                      </span>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      {a.picks?.map((p, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-gray-400 mt-1">•</span>
                          <span>{p.matchDescription} — <strong>{p.prediction}</strong> @ {Number(p.odds).toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-3 flex-shrink-0">
                    <button
                      onClick={() => approve(a.id)}
                      disabled={acting === a.id}
                      className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => reject(a.id)}
                      disabled={acting === a.id}
                      className="px-6 py-3 rounded-xl font-semibold bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
