'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { PickCard } from '@/components/PickCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/hooks/useToast';
import { formatError } from '@/utils/errorMessages';
import { ErrorToast } from '@/components/ErrorToast';
import { SuccessToast } from '@/components/SuccessToast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001';

type PriceFilter = 'all' | 'free' | 'paid';
type SortBy = 'newest' | 'price-low' | 'price-high' | 'tipster-rank';

interface Pick {
  id: number;
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
  purchaseCount?: number;
  picks: Pick[];
  tipster?: Tipster | null;
  createdAt?: string;
  updatedAt?: string;
}

interface User {
  id: number;
  displayName: string;
  email: string;
}

export default function MarketplacePage() {
  const router = useRouter();
  const [picks, setPicks] = useState<Accumulator[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [purchasedIds, setPurchasedIds] = useState<Set<number>>(new Set());
  const [unveilCouponId, setUnveilCouponId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const { showError, showSuccess, clearError, clearSuccess, error: toastError, success: toastSuccess } = useToast();

  const filteredAndSortedPicks = useMemo(() => {
    let list = [...picks];
    if (priceFilter === 'free') list = list.filter((p) => p.price === 0);
    if (priceFilter === 'paid') list = list.filter((p) => p.price > 0);
    if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else if (sortBy === 'price-low') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'tipster-rank') {
      list.sort((a, b) => (a.tipster?.rank ?? 999) - (b.tipster?.rank ?? 999));
    }
    return list;
  }, [picks, priceFilter, sortBy]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    // Fetch marketplace picks, wallet balance, user info, and purchased picks
    Promise.all([
      fetch(`${API_URL}/accumulators/marketplace`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_URL}/wallet/balance`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => (r.ok ? r.json() : null)),
      fetch(`${API_URL}/accumulators/purchased`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([marketplaceData, walletData, purchasedData, userData]) => {
        setPicks(Array.isArray(marketplaceData) ? marketplaceData : []);
        if (walletData) setWalletBalance(Number(walletData.balance));
        if (userData) setCurrentUserId(userData.id);
        if (Array.isArray(purchasedData)) {
          const purchasedSet = new Set(purchasedData.map((p: any) => p.accumulatorId || p.pick?.id));
          setPurchasedIds(purchasedSet);
        }
      })
      .catch((err) => {
        setPicks([]);
        showError(err);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const purchase = async (id: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const coupon = picks.find(p => p.id === id);
    if (!coupon) return;
    
    // Check wallet balance for paid coupons
    if (coupon.price > 0 && (walletBalance === null || walletBalance < coupon.price)) {
      showError(new Error(`Insufficient funds. You need GHS ${coupon.price.toFixed(2)} but only have GHS ${walletBalance?.toFixed(2) || '0.00'}.`));
      return;
    }
    
    setPurchasing(id);
    try {
      const res = await fetch(`${API_URL}/accumulators/${id}/purchase`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const purchasedTicket = await res.json();
        showSuccess('Coupon purchased! View your picks in My Purchases.');
        // Mark as purchased
        setPurchasedIds(prev => new Set([...Array.from(prev), id]));
        // Refresh wallet balance
        const walletRes = await fetch(`${API_URL}/wallet/balance`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (walletRes.ok) {
          const walletData = await walletRes.json();
          setWalletBalance(Number(walletData.balance));
        }
        // Update pick data
        setPicks(prev => prev.map(p => 
          p.id === id ? { ...p, purchased: true, purchasedTicket } : p
        ));
        // Trigger unveil modal
        setUnveilCouponId(id);
      } else {
        const err = await res.json().catch(() => ({}));
        const errorMessage = err.message || 'Purchase failed';
        showError(new Error(errorMessage));
      }
    } catch (error: any) {
      showError(error);
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <AppShell>
      {toastError ? <ErrorToast error={toastError} onClose={clearError} /> : null}
      {toastSuccess ? <SuccessToast message={toastSuccess} onClose={clearSuccess} /> : null}
      <div className="dashboard-bg dashboard-pattern min-h-[calc(100vh-8rem)]">
        <div className="w-full px-4 sm:px-5 md:px-6 lg:px-8 py-5 md:py-6 pb-24">
          <PageHeader
            label="Marketplace"
            title="Marketplace"
            tagline="Browse and buy verified tips from top tipsters"
          />

          {/* Filters */}
          {!loading && picks.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-[var(--text)]">Price</label>
                <select
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value as PriceFilter)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary)] min-w-[120px]"
                >
                  <option value="all">All</option>
                  <option value="free">Free only</option>
                  <option value="paid">Paid only</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-[var(--text)]">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary)] min-w-[140px]"
                >
                  <option value="newest">Newest first</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="tipster-rank">Tipster rank</option>
                </select>
              </div>
              {(priceFilter !== 'all' || sortBy !== 'newest') && (
                <button
                  onClick={() => {
                    setPriceFilter('all');
                    setSortBy('newest');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {loading && (
            <LoadingSkeleton count={8} variant="cards" />
          )}
        {!loading && picks.length === 0 && (
          <div className="card-gradient rounded-2xl">
            <EmptyState
              title="No picks available"
              description="There are no picks available on the marketplace right now. Check back later or create your own pick to share with others."
              actionLabel="Create Pick"
              actionHref="/create-pick"
              icon="🛒"
            />
          </div>
        )}
        {!loading && picks.length > 0 && filteredAndSortedPicks.length === 0 && (
          <div className="card-gradient rounded-2xl p-6">
            <EmptyState
              title="No picks match your filters"
              description="Try adjusting your filters to see more coupons."
              actionLabel="Clear filters"
              onActionClick={() => {
                setPriceFilter('all');
                setSortBy('newest');
              }}
              icon="🔍"
            />
          </div>
        )}
        {!loading && filteredAndSortedPicks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-8">
            {filteredAndSortedPicks.map((a) => {
              const isPurchased = purchasedIds.has(a.id);
              const canPurchase = a.price === 0 || (walletBalance !== null && walletBalance >= a.price);
              
              return (
                <PickCard
                  key={a.id}
                  id={a.id}
                  title={a.title}
                  totalPicks={a.totalPicks}
                  totalOdds={a.totalOdds}
                  price={a.price}
                  purchaseCount={a.purchaseCount}
                  picks={a.picks || []}
                  tipster={a.tipster}
                  isPurchased={isPurchased}
                  canPurchase={canPurchase}
                  walletBalance={walletBalance}
                  onPurchase={() => purchase(a.id)}
                  purchasing={purchasing === a.id}
                  showUnveil={unveilCouponId === a.id}
                  onUnveilClose={() => setUnveilCouponId(null)}
                  createdAt={a.createdAt}
                />
              );
            })}
          </div>
        )}
        </div>
      </div>
    </AppShell>
  );
}
