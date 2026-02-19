'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/DashboardShell';
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
  status?: string;
}

interface Accumulator {
  id: number;
  title: string;
  totalOdds: number;
  totalPicks: number;
  price: number;
  status: string;
  result: string;
  isMarketplace: boolean;
  picks: Pick[];
  createdAt?: string;
  updatedAt?: string;
}

export default function MyPicksPage() {
  const router = useRouter();
  const [picks, setPicks] = useState<Accumulator[]>([]);
  const [loading, setLoading] = useState(true);
  const { showError, clearError, error: toastError } = useErrorToast();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetch(`${getApiUrl()}/accumulators/my`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) {
          throw new Error(`Failed to load picks: ${r.status}`);
        }
        return r.json();
      })
      .then((data) => setPicks(Array.isArray(data) ? data : []))
      .catch((err) => {
        setPicks([]);
        showError(err);
      })
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <DashboardShell>
      {toastError ? <ErrorToast error={toastError} onClose={clearError} /> : null}
      <div className="dashboard-bg dashboard-pattern min-h-[calc(100vh-8rem)]">
        <div className="w-full px-4 sm:px-5 md:px-6 lg:px-8 py-5 md:py-6 pb-24">
          <PageHeader
            label="My Picks"
            title="My Picks"
            tagline="Your tips and their performance"
            action={
              <a
                href="/create-pick"
                className="inline-flex items-center justify-center min-h-[40px] px-4 py-2 rounded-xl text-sm font-semibold bg-white/20 hover:bg-white/30 text-white border border-white/30 transition-colors"
              >
                Create Pick
              </a>
            }
          />

          {loading && <LoadingSkeleton count={3} />}
          {!loading && picks.length === 0 && (
            <div className="card-gradient rounded-2xl">
              <EmptyState
                title="No picks yet"
                description="Create your first pick and share it on the marketplace."
                actionLabel="Create Pick"
                actionHref="/create-pick"
                icon="🎯"
              />
            </div>
          )}
          {!loading && picks.length > 0 && (
            <div className="space-y-3 pb-6">
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
                  isPurchased={true}
                  createdAt={a.createdAt}
                  onPurchase={() => { }}
                  purchasing={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
