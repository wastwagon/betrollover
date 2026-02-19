'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { PageHeader } from '@/components/PageHeader';
import { PickCard } from '@/components/PickCard';
import { getApiUrl } from '@/lib/site-config';

interface Subscription {
  id: number;
  packageId: number;
  startedAt: string;
  endsAt: string;
  amountPaid: number;
  status: string;
  package?: { id: number; name: string; price: number; durationDays: number };
}

interface FeedPick {
  id: number;
  title: string;
  totalPicks: number;
  totalOdds: number;
  price: number;
  purchaseCount: number;
  picks: Array<{ matchDescription?: string; prediction?: string; odds?: number }>;
  tipster?: { displayName: string; username: string; avatarUrl: string | null; winRate: number } | null;
}

export default function SubscriptionsPage() {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [feedPicks, setFeedPicks] = useState<FeedPick[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login?redirect=/subscriptions');
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    const apiUrl = getApiUrl();
    Promise.all([
      fetch(`${apiUrl}/subscriptions/me`, { headers }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${apiUrl}/accumulators/subscription-feed?limit=20`, { headers }).then((r) =>
        r.ok ? r.json().then((d: { items?: FeedPick[] }) => d?.items ?? []) : [],
      ),
    ])
      .then(([subs, feed]) => {
        setSubscriptions(Array.isArray(subs) ? subs : []);
        setFeedPicks(Array.isArray(feed) ? feed : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <DashboardShell>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  const activeSubs = subscriptions.filter((s) => s.status === 'active');

  return (
    <DashboardShell>
      <div className="w-full px-4 sm:px-5 md:px-6 py-6 pb-24">
        <PageHeader
          label="Subscriptions"
          title="My Subscriptions"
          tagline="View coupons from tipsters you subscribe to."
        />

        {activeSubs.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center border border-[var(--border)]">
            <p className="text-[var(--text-muted)] mb-4">No active subscriptions yet.</p>
            <p className="text-sm text-[var(--text-muted)] mb-6">Subscribe to tipsters to see their subscription-only coupons here.</p>
            <Link
              href="/tipsters"
              className="inline-flex items-center justify-center px-5 py-3 rounded-xl font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
            >
              Browse Tipsters
            </Link>
          </div>
        ) : (
          <>
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Active subscriptions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeSubs.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl p-4 border border-[var(--border)] bg-[var(--card)]"
                  >
                    <h3 className="font-semibold text-[var(--text)]">{s.package?.name ?? 'Package'}</h3>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                      Ends {new Date(s.endsAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm font-medium text-[var(--primary)] mt-2">
                      GHS {Number(s.amountPaid).toFixed(2)}/{s.package?.durationDays ?? 30}d
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Subscription coupons</h2>
              {feedPicks.length === 0 ? (
                <p className="text-[var(--text-muted)]">No coupons from subscribed tipsters yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {feedPicks.map((pick) => {
                    const t = pick.tipster;
                    const tipster = t
                      ? {
                          id: 0,
                          displayName: t.displayName,
                          username: t.username,
                          avatarUrl: t.avatarUrl ?? null,
                          winRate: t.winRate,
                          totalPicks: 0,
                          wonPicks: 0,
                          lostPicks: 0,
                          rank: 0,
                        }
                      : null;
                    return (
                      <PickCard
                        key={pick.id}
                        id={pick.id}
                        title={pick.title}
                        totalPicks={pick.totalPicks}
                        totalOdds={pick.totalOdds}
                        price={pick.price}
                        purchaseCount={pick.purchaseCount}
                        picks={pick.picks || []}
                        tipster={tipster}
                        isPurchased={true}
                        canPurchase={false}
                        walletBalance={null}
                        onPurchase={() => {}}
                        viewOnly
                        purchasing={false}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
