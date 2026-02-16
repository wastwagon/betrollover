'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001';

interface CouponFixture {
  home: string;
  away: string;
  league: string;
  market: string;
  tip: string;
  confidence: number;
  odds: number;
  status?: string;
}

interface SmartCoupon {
  id: number;
  date: string;
  totalOdds: number;
  status: string;
  profit: number;
  fixtures: CouponFixture[];
}

interface ArchiveStats {
  total: number;
  won: number;
  lost: number;
  roi: number;
}

export default function CouponsArchivePage() {
  const [coupons, setCoupons] = useState<SmartCoupon[]>([]);
  const [stats, setStats] = useState<ArchiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadArchive = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (statusFilter) params.set('status', statusFilter);
    fetch(`${API_URL}/coupons/archive?${params.toString()}`)
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
    loadArchive();
    loadStats();
  }, []);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    loadArchive();
  };

  const statusBadge = (s: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      won: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      lost: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[s] || 'bg-gray-100 text-gray-800'}`}>
        {s}
      </span>
    );
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 py-10 md:py-16">
        <div className="mb-10">
          <Link href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--primary)] mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--text)]">Smart Coupons Archive</h1>
          <p className="mt-2 text-[var(--text-muted)]">
            Past performance & ROI — Smart Double Chance strategy (70%+ confidence, global competitions)
          </p>
        </div>

        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
              <p className="text-sm text-[var(--text-muted)]">Total Coupons</p>
              <p className="text-2xl font-bold text-[var(--text)]">{stats.total}</p>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
              <p className="text-sm text-[var(--text-muted)]">Won</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.won}</p>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
              <p className="text-sm text-[var(--text-muted)]">Lost</p>
              <p className="text-2xl font-bold text-red-600">{stats.lost}</p>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
              <p className="text-sm text-[var(--text-muted)]">ROI %</p>
              <p className={`text-2xl font-bold ${stats.roi >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {stats.roi.toFixed(1)}%
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <form onSubmit={handleFilter} className="flex flex-wrap gap-4 mb-8">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text)]"
            placeholder="From"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text)]"
            placeholder="To"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text)]"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
          <button
            type="submit"
            className="px-6 py-2 rounded-xl font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
          >
            Filter
          </button>
        </form>

        {/* Coupons list */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-[var(--card)] border border-[var(--border)] animate-pulse" />
            ))}
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
            <p className="text-[var(--text-muted)]">No coupons found. Generate some from Admin → Smart Coupons.</p>
            <Link href="/" className="mt-4 inline-block text-[var(--primary)] hover:underline">
              Back to Home
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {coupons.map((c) => (
              <div
                key={c.id}
                className="p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/20 transition-colors"
              >
                <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                  <span className="text-sm font-medium text-[var(--primary)]">
                    {new Date(c.date).toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-[var(--text)]">{Number(c.totalOdds).toFixed(2)}</span>
                    {statusBadge(c.status)}
                    {c.profit !== 0 && (
                      <span className={`text-sm font-medium ${c.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {c.profit >= 0 ? '+' : ''}{Number(c.profit).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  {(c.fixtures || []).map((f, i) => (
                    <div key={i} className="text-sm border-l-2 border-[var(--border)] pl-4">
                      <p className="font-medium text-[var(--text)]">
                        {f.home} v {f.away}
                      </p>
                      <p className="text-[var(--text-muted)] text-xs">{f.league}</p>
                      <p className="text-[var(--primary)] font-medium mt-1">{f.tip}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        Odds: {Number(f.odds).toFixed(2)} · Confidence: {(f.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
