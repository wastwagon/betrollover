'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { getApiUrl } from '@/lib/site-config';

interface PackageInfo {
  id: number;
  name: string;
  price: number;
  durationDays: number;
  status: string;
  tipsterUserId?: number;
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawId = searchParams.get('packageId');
  const packageId = rawId ? parseInt(rawId, 10) : NaN;

  const [pkg, setPkg] = useState<PackageInfo | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(packageId) || packageId < 1) {
      setLoading(false);
      setError('Invalid package.');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      router.push(`/login?redirect=/subscriptions/checkout?packageId=${packageId}`);
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    const apiUrl = getApiUrl();
    Promise.all([
      fetch(`${apiUrl}/subscriptions/packages/package/${packageId}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`${apiUrl}/wallet/balance`, { headers }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([p, w]) => {
        if (!p || p.status !== 'active') {
          setError('This VIP package is not available.');
          setPkg(null);
          return;
        }
        setPkg(p);
        if (w?.balance != null) setBalance(Number(w.balance));
      })
      .catch(() => setError('Could not load package.'))
      .finally(() => setLoading(false));
  }, [packageId, router]);

  const pay = async () => {
    const token = localStorage.getItem('token');
    if (!token || !pkg) return;
    setPaying(true);
    setError(null);
    try {
      const res = await fetch(`${getApiUrl()}/subscriptions/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ packageId: pkg.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.message === 'string' ? data.message : 'Payment failed');
        return;
      }
      router.push('/subscriptions');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="w-full px-4 sm:px-5 md:px-6 py-6 pb-24 max-w-lg mx-auto">
          <LoadingSkeleton count={3} variant="list" />
        </div>
      </DashboardShell>
    );
  }

  const price = pkg ? Number(pkg.price) : 0;
  const canPay = pkg && balance !== null && balance >= price && price > 0;

  return (
    <DashboardShell>
      <div className="w-full px-4 sm:px-5 md:px-6 py-6 pb-24 max-w-lg mx-auto">
        <Link href="/tipsters" className="text-sm text-[var(--primary)] hover:underline mb-4 inline-block">
          ← Tipsters
        </Link>
        <PageHeader label="VIP" title="Join VIP" tagline="Pay from your wallet to unlock this tipster’s subscription picks." />

        {error && (
          <div className="mb-4 p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 text-sm">
            {error}
          </div>
        )}

        {pkg && (
          <div className="glass-card rounded-2xl p-6 border border-[var(--border)] space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text)]">{pkg.name}</h2>
              <p className="text-2xl font-bold text-[var(--primary)] mt-2">
                GHS {price.toFixed(2)} / {pkg.durationDays} days
              </p>
            </div>
            <div className="text-sm text-[var(--text-muted)]">
              Wallet balance:{' '}
              <span className="font-medium text-[var(--text)]">
                {balance !== null ? `GHS ${balance.toFixed(2)}` : '—'}
              </span>
            </div>
            {price <= 0 && <p className="text-sm text-amber-700">This package has no price set.</p>}
            {balance !== null && balance < price && price > 0 && (
              <p className="text-sm text-[var(--text-muted)]">
                Top up your wallet to subscribe.{' '}
                <Link href="/wallet" className="text-[var(--primary)] font-medium hover:underline">
                  Open wallet
                </Link>
              </p>
            )}
            <button
              type="button"
              onClick={() => void pay()}
              disabled={paying || !canPay}
              className="w-full py-3 rounded-xl font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {paying ? 'Processing…' : 'Pay from wallet'}
            </button>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

export default function SubscriptionCheckoutPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell>
          <div className="w-full px-4 py-6 pb-24 max-w-lg mx-auto">
            <LoadingSkeleton count={3} variant="list" />
          </div>
        </DashboardShell>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
