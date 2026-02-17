'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:6001';

interface CouponFixture {
  home: string;
  away: string;
  league: string;
  market: string;
  tip: string;
  confidence: number;
  odds: number;
}

interface SmartCoupon {
  id: number;
  date: string;
  totalOdds: number;
  status: string;
  fixtures: CouponFixture[];
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<SmartCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ total: number; won: number; lost: number; roi: number } | null>(null);

  const loadCoupons = () => {
    setLoading(true);
    fetch(`${API_URL}/coupons/archive?from=&to=&status=`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCoupons(Array.isArray(data) ? data : []))
      .catch(() => setCoupons([]))
      .finally(() => setLoading(false));
  };

  const loadStats = () => {
    fetch(`${API_URL}/coupons/archive/stats`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setStats(data))
      .catch(() => setStats(null));
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    loadCoupons();
    loadStats();
  }, []);

  const handleGenerate = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setGenerating(true);
    setError(null);
    fetch(`${API_URL}/coupons/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText || 'Failed to generate');
        return r.json();
      })
      .then((data) => {
        setCoupons((prev) => (Array.isArray(data) ? [...data, ...prev] : prev));
        loadStats();
      })
      .catch((err) => setError(err?.message || 'Generation failed'))
      .finally(() => setGenerating(false));
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <AdminSidebar />
      <main className="flex-1 ml-56 p-8">
        <div className="max-w-5xl">
          <h1 className="text-2xl font-bold text-[var(--text)]">Smart Coupons</h1>
          <p className="mt-1 text-[var(--text-muted)]">
            Generate high-value Double Chance coupons from API-Football predictions (7 days, all enabled leagues, 70%+ confidence)
          </p>

          <div className="mt-6 flex flex-wrap gap-4 items-center">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-6 py-3 rounded-xl font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? 'Generating…' : 'Generate Smart Coupons'}
            </button>
            <Link
              href="/coupons/archive"
              className="px-6 py-3 rounded-xl font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--card)]"
            >
              View Archive
            </Link>
          </div>

          {error && (
            <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {stats && (
            <div className="mt-6 grid grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                <p className="text-sm text-[var(--text-muted)]">Total</p>
                <p className="text-xl font-bold text-[var(--text)]">{stats.total}</p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                <p className="text-sm text-[var(--text-muted)]">Won</p>
                <p className="text-xl font-bold text-emerald-600">{stats.won}</p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                <p className="text-sm text-[var(--text-muted)]">Lost</p>
                <p className="text-xl font-bold text-red-600">{stats.lost}</p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                <p className="text-sm text-[var(--text-muted)]">ROI %</p>
                <p className={`text-xl font-bold ${stats.roi >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {stats.roi.toFixed(1)}%
                </p>
              </div>
            </div>
          )}

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Recent Coupons</h2>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 rounded-xl bg-[var(--card)] border border-[var(--border)] animate-pulse" />
                ))}
              </div>
            ) : coupons.length === 0 ? (
              <p className="text-[var(--text-muted)]">No coupons yet. Click &quot;Generate Smart Coupons&quot; to create some.</p>
            ) : (
              <div className="space-y-4">
                {coupons.slice(0, 20).map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] flex justify-between items-center"
                  >
                    <div>
                      <span className="font-medium text-[var(--text)]">
                        {new Date(c.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                      <span className="ml-3 text-[var(--text-muted)]">
                        {(c.fixtures || []).map((f) => `${f.home} v ${f.away}`).join(' · ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[var(--text)]">{Number(c.totalOdds).toFixed(2)}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          c.status === 'won'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.status === 'lost'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
