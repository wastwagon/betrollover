'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { PickCard } from '@/components/PickCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { useErrorToast } from '@/hooks/useErrorToast';
import { ErrorToast } from '@/components/ErrorToast';
import { getApiUrl } from '@/lib/site-config';

interface Pick {
  id: number;
  matchDescription?: string;
  prediction?: string;
  odds?: number;
  homeScore?: number | null;
  awayScore?: number | null;
  fixtureStatus?: string | null;
  matchDate?: string;
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
    picks: Pick[];
  };
}

export default function MyPurchasesPage() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const { showError, clearError, error: toastError } = useErrorToast();

  const fetchPurchases = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    return fetch(`${getApiUrl()}/accumulators/purchased`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load purchases: ${r.status}`);
        return r.json();
      })
      .then((data) => setPurchases(Array.isArray(data) ? data : []))
      .catch((err) => {
        setPurchases([]);
        showError(err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPurchases();
  }, [router, showError]);

  // Auto-refresh every 60s when user has active purchases (to show live score updates)
  useEffect(() => {
    if (purchases.length === 0 || loading) return;
    const hasActive = purchases.some((p) => p.pick?.status === 'active' && p.pick?.result === 'pending');
    if (!hasActive) return;
    const interval = setInterval(() => {
      const token = localStorage.getItem('token');
      if (token) {
        fetch(`${getApiUrl()}/accumulators/purchased`, { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => r.ok ? r.json() : [])
          .then((data) => setPurchases(Array.isArray(data) ? data : []))
          .catch(() => {});
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [purchases.length, loading]);

  return (
    <AppShell>
      {toastError ? <ErrorToast error={toastError} onClose={clearError} /> : null}
      <div className="dashboard-bg dashboard-pattern min-h-[calc(100vh-8rem)]">
        <div className="w-full px-4 sm:px-5 md:px-6 lg:px-8 py-5 md:py-6 pb-24">
          <PageHeader
            label="My Purchases"
            title="My Purchases"
            tagline="Your purchased picks and their status"
          />

          {loading && <LoadingSkeleton count={3} />}
          {!loading && purchases.length === 0 && (
            <div className="card-gradient rounded-2xl">
              <EmptyState
                title="No purchases yet"
                description="Browse the marketplace and purchase picks from top tipsters."
                actionLabel="Browse Marketplace"
                actionHref="/marketplace"
                icon="🛒"
              />
            </div>
          )}
          {!loading && purchases.length > 0 && (
            <div className="space-y-3 pb-6">
            {purchases.map((p) => (
              p.pick && (
                <PickCard
                  key={p.id}
                  id={p.pick.id}
                  title={p.pick.title}
                  totalPicks={p.pick.totalPicks}
                  totalOdds={p.pick.totalOdds}
                  price={p.purchasePrice}
                  status={p.pick.status}
                  result={p.pick.result}
                  picks={p.pick.picks || []}
                  isPurchased={true}
                  onPurchase={() => {}}
                  purchasing={false}
                />
              )
            ))}
          </div>
        )}
        </div>
      </div>
    </AppShell>
  );
}
