'use client';

import { useCallback, useEffect, useState } from 'react';
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
  rank: number | null;
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

type ArchiveSummary = { total: number; wonTotal: number; lostTotal: number };

function parseArchiveResponse(data: unknown): { items: Coupon[]; summary: ArchiveSummary | null } {
  if (data == null || typeof data !== 'object') {
    return { items: [], summary: null };
  }
  if (Array.isArray(data)) {
    const items = data as Coupon[];
    const wonTotal = items.filter((c) => c.result === 'won').length;
    const lostTotal = items.filter((c) => c.result === 'lost').length;
    return { items, summary: { total: items.length, wonTotal, lostTotal } };
  }
  const obj = data as Record<string, unknown>;
  const items = Array.isArray(obj.items) ? (obj.items as Coupon[]) : [];
  if (typeof obj.total === 'number' || typeof obj.total === 'string') {
    const total = Number(obj.total);
    const wonTotal = Number(obj.wonTotal ?? obj.won_total ?? 0);
    const lostTotal = Number(obj.lostTotal ?? obj.lost_total ?? 0);
    return { items, summary: { total, wonTotal, lostTotal } };
  }
  const wonTotal = items.filter((c) => c.result === 'won').length;
  const lostTotal = items.filter((c) => c.result === 'lost').length;
  return { items, summary: { total: items.length, wonTotal, lostTotal } };
}

const ARCHIVE_POLL_MS = 45_000;

export default function CouponsArchivePage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [summary, setSummary] = useState<ArchiveSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [resultFilter, setResultFilter] = useState<'all' | 'won' | 'lost'>('all');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [purchasedIds, setPurchasedIds] = useState<Set<number>>(new Set());

  const loadArchive = useCallback(async (opts?: { withWallet?: boolean }) => {
    const withWallet = opts?.withWallet !== false;
    const token = withWallet ? localStorage.getItem('token') : null;
    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const archiveRes = await fetch(`${getApiUrl()}/accumulators/archive?limit=100`, { cache: 'no-store' });
      const raw = archiveRes.ok ? await archiveRes.json() : [];
      const { items, summary: nextSummary } = parseArchiveResponse(raw);
      setCoupons(items);
      setSummary(nextSummary);

      if (withWallet && token) {
        const [wallet, purchased] = await Promise.all([
          fetch(`${getApiUrl()}/wallet/balance`, { headers: authHeaders }).then((r) => (r.ok ? r.json() : null)),
          fetch(`${getApiUrl()}/accumulators/purchased`, { headers: authHeaders }).then((r) => (r.ok ? r.json() : [])),
        ]);
        if (wallet) setWalletBalance(Number(wallet.balance));
        const ids = new Set<number>((purchased || []).map((p: { accumulatorId?: number }) => p.accumulatorId).filter(Boolean));
        setPurchasedIds(ids);
      }
    } catch {
      setCoupons([]);
      setSummary(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadArchive({ withWallet: true });
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadArchive]);

  useEffect(() => {
    const tick = () => {
      void loadArchive({ withWallet: false });
    };
    const id = window.setInterval(tick, ARCHIVE_POLL_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [loadArchive]);

  const filtered = coupons.filter((c) => {
    if (resultFilter === 'all') return true;
    return c.result === resultFilter;
  });

  const wonCount = summary?.wonTotal ?? coupons.filter((c) => c.result === 'won').length;
  const lostCount = summary?.lostTotal ?? coupons.filter((c) => c.result === 'lost').length;
  const totalSettled = summary?.total ?? coupons.length;
  const winRate = totalSettled > 0 ? Math.round((wonCount / totalSettled) * 100) : 0;

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <UnifiedHeader />
      <main className="section-ux-page-wide w-full min-w-0 max-w-full">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 min-w-0">
          <div className="min-w-0 flex-1 max-w-full">
            <PageHeader
              label="Archive"
              title="Coupons Archive"
              tagline="Historical coupons — settled results with full performance record."
            />
          </div>
          <Link
            href="/coupons"
            className="inline-flex justify-center items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors w-full sm:w-auto self-stretch sm:self-auto shrink-0"
          >
            ← Active Coupons
          </Link>
        </div>

        <div className="mb-6">
          <AdSlot zoneSlug="coupons-archive-full" fullWidth className="w-full max-w-3xl" />
        </div>

        {/* Summary stats — API totals (full archive), not limited to this page of cards */}
        {!loading && totalSettled > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 min-w-0">
            <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-center min-w-0">
              <p className="text-lg font-semibold text-[var(--text)]">{totalSettled}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Total Settled</p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center min-w-0">
              <p className="text-lg font-semibold text-emerald-700">{wonCount}</p>
              <p className="text-xs text-emerald-600 mt-1">Won</p>
            </div>
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-center min-w-0">
              <p className="text-lg font-semibold text-red-700">{lostCount}</p>
              <p className="text-xs text-red-600 mt-1">Lost ({winRate}% win rate)</p>
            </div>
          </div>
        )}

        {/* Result filter */}
        <div className="mb-6 w-full min-w-0 overflow-hidden">
        <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 scrollbar-hide -mx-1 px-1 touch-pan-x [-webkit-overflow-scrolling:touch]">
          {(['all', 'won', 'lost'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setResultFilter(f)}
              className={`shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                resultFilter === f
                  ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                  : 'bg-[var(--card)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text)]'
              }`}
            >
              {f === 'all' ? 'All Results' : f === 'won' ? '✅ Won' : '❌ Lost'}
            </button>
          ))}
        </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-w-0">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-w-0">
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
