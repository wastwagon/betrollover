'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { AdSlot } from '@/components/AdSlot';
import { PickCard } from '@/components/PickCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { getApiUrl } from '@/lib/site-config';

interface Pick {
  id?: number;
  matchDescription?: string;
  prediction?: string;
  odds?: number;
  matchDate?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  fixtureStatus?: string | null;
  result?: string;
}

interface Tipster {
  id: number;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  winRate: number;
  totalPicks: number;
  wonPicks: number;
  lostPicks: number;
  rank: number;
}

interface Coupon {
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

export default function CouponsArchivePage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultFilter, setResultFilter] = useState<'all' | 'won' | 'lost'>('all');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [purchasedIds, setPurchasedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const token = localStorage.getItem('token');
    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    Promise.all([
      // Archive is public — no auth required
      fetch(`${getApiUrl()}/accumulators/archive?limit=100`)
        .then((r) => r.ok ? r.json() : []),
      token ? fetch(`${getApiUrl()}/wallet/balance`, { headers: authHeaders }).then((r) => r.ok ? r.json() : null) : Promise.resolve(null),
      token ? fetch(`${getApiUrl()}/accumulators/purchased`, { headers: authHeaders }).then((r) => r.ok ? r.json() : []) : Promise.resolve([]),
    ]).then(([data, wallet, purchased]) => {
      setCoupons(Array.isArray(data) ? data : (data?.items ?? []));
      if (wallet) setWalletBalance(Number(wallet.balance));
      const ids = new Set<number>((purchased || []).map((p: { accumulatorId?: number }) => p.accumulatorId).filter(Boolean));
      setPurchasedIds(ids);
    }).catch(() => setCoupons([])).finally(() => setLoading(false));
  }, []);

  const filtered = coupons.filter((c) => {
    if (resultFilter === 'all') return true;
    return c.result === resultFilter;
  });

  const wonCount = coupons.filter((c) => c.result === 'won').length;
  const lostCount = coupons.filter((c) => c.result === 'lost').length;
  const winRate = coupons.length > 0 ? Math.round((wonCount / coupons.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <UnifiedHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <PageHeader
            label="Archive"
            title="Coupons Archive"
            tagline="Historical coupons — settled results with full performance record."
          />
          <Link
            href="/coupons"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors self-start sm:self-auto"
          >
            ← Active Coupons
          </Link>
        </div>

        <div className="mb-6">
          <AdSlot zoneSlug="coupons-archive-full" fullWidth className="w-full max-w-3xl" />
        </div>

        {/* Summary stats */}
        {!loading && coupons.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-center">
              <p className="text-2xl font-bold text-[var(--text)]">{coupons.length}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Total Settled</p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <p className="text-2xl font-bold text-emerald-700">{wonCount}</p>
              <p className="text-xs text-emerald-600 mt-1">Won</p>
            </div>
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-center">
              <p className="text-2xl font-bold text-red-700">{lostCount}</p>
              <p className="text-xs text-red-600 mt-1">Lost ({winRate}% win rate)</p>
            </div>
          </div>
        )}

        {/* Result filter */}
        <div className="flex gap-2 mb-6">
          {(['all', 'won', 'lost'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setResultFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                resultFilter === f
                  ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                  : 'bg-[var(--card)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text)]'
              }`}
            >
              {f === 'all' ? 'All Results' : f === 'won' ? '✅ Won' : '❌ Lost'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <LoadingSkeleton key={i} count={1} className="h-64 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No archived coupons"
            description="Settled coupons will appear here after their matches conclude."
            actionLabel="Browse Active Coupons"
            actionHref="/coupons"
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((coupon) => (
              <PickCard
                key={coupon.id}
                id={coupon.id}
                title={coupon.title}
                sport={coupon.sport}
                totalPicks={coupon.totalPicks}
                totalOdds={coupon.totalOdds}
                price={coupon.price}
                status={coupon.status}
                result={coupon.result}
                picks={coupon.picks || []}
                purchaseCount={coupon.purchaseCount}
                tipster={coupon.tipster ?? null}
                isPurchased={purchasedIds.has(coupon.id)}
                canPurchase={false}
                walletBalance={walletBalance}
                viewOnly
                onPurchase={() => {}}
                createdAt={coupon.createdAt}
              />
            ))}
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
