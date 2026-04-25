'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EscrowTrustCallout } from '@/components/EscrowTrustCallout';
import { getApiUrl } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { useT } from '@/context/LanguageContext';

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
  const t = useT();
  const rawId = searchParams.get('packageId');
  const packageId = rawId ? parseInt(rawId, 10) : NaN;
  const fromTipster = searchParams.get('fromTipster');
  const autoSubscribe = searchParams.get('autoSubscribe') === '1';
  const autoAttemptId = searchParams.get('autoAttemptId');
  const continueUrl = Number.isFinite(packageId) && packageId > 0
    ? `/subscriptions/checkout?packageId=${packageId}${fromTipster ? `&fromTipster=${encodeURIComponent(fromTipster)}` : ''}`
    : '/subscriptions/marketplace';

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
      router.push(`/login?redirect=${encodeURIComponent(continueUrl)}`);
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

  const pay = useCallback(async (): Promise<boolean> => {
    const token = localStorage.getItem('token');
    if (!token || !pkg) return false;
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
        setError(getApiErrorMessage(data, 'Payment failed'));
        return false;
      }
      router.push('/subscriptions?subscribed=1');
      return true;
    } catch {
      setError('Could not complete subscription. Please try again.');
      return false;
    } finally {
      setPaying(false);
    }
  }, [pkg, router]);

  const price = pkg ? Number(pkg.price) : 0;
  const canPay = pkg && balance !== null && balance >= price;
  const walletTopUpHref = `/wallet?continue=${encodeURIComponent(continueUrl)}`;
  const backHref = fromTipster ? `/tipsters/${encodeURIComponent(fromTipster)}` : '/tipsters';
  const autoAttemptKey = useMemo(
    () =>
      Number.isFinite(packageId) && packageId > 0 && autoAttemptId
        ? `subscriptions.checkout.autoAttempted.${packageId}.${autoAttemptId}`
        : '',
    [packageId, autoAttemptId],
  );

  useEffect(() => {
    if (!autoSubscribe || !canPay || paying || !autoAttemptKey) return;
    const attempted = sessionStorage.getItem(autoAttemptKey);
    if (attempted === '1') return;
    sessionStorage.setItem(autoAttemptKey, '1');
    void pay().then((ok) => {
      if (!ok) sessionStorage.removeItem(autoAttemptKey);
    });
  }, [autoSubscribe, canPay, paying, autoAttemptKey, pay]);

  if (loading) {
    return (
      <DashboardShell>
        <div className="section-ux-dashboard-shell max-w-lg mx-auto w-full min-w-0 max-w-full px-1 sm:px-0">
          <LoadingSkeleton count={3} variant="list" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="section-ux-dashboard-shell max-w-lg mx-auto w-full min-w-0 max-w-full px-1 sm:px-0">
        <Link href={backHref} className="text-sm text-[var(--primary)] hover:underline mb-4 inline-block">
          ← Tipsters
        </Link>
        <PageHeader label="VIP" title="Join VIP" tagline="Pay from your wallet to unlock this tipster’s subscription picks." />
        <EscrowTrustCallout
          className="mb-4"
          title={t('marketplace.trust_callout_title')}
          body={t('marketplace.trust_callout_body')}
          linkLabel={t('home.how_it_works')}
        />

        {error && (
          <div className="mb-4 p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 text-sm">
            {error}
          </div>
        )}

        {pkg && (
          <div className="glass-card rounded-2xl p-6 border border-[var(--border)] space-y-4 min-w-0">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-[var(--text)] break-words">{pkg.name}</h2>
              <p className="text-2xl font-bold text-[var(--primary)] mt-2 tabular-nums">
                GHS {price.toFixed(2)} / {pkg.durationDays} days
              </p>
            </div>
            <div className="text-sm text-[var(--text-muted)]">
              Wallet balance:{' '}
              <span className="font-medium text-[var(--text)] tabular-nums">
                {balance !== null ? `GHS ${balance.toFixed(2)}` : '—'}
              </span>
            </div>
            {balance !== null && balance < price && price > 0 && (
              <p className="text-sm text-[var(--text-muted)]">
                Top up your wallet to subscribe.{' '}
                <Link href={walletTopUpHref} className="text-[var(--primary)] font-medium hover:underline">
                  Top up and continue
                </Link>
              </p>
            )}
            {autoSubscribe && canPay && (
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Wallet topped up. Completing your subscription automatically...
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
          <div className="section-ux-dashboard-shell max-w-lg mx-auto w-full min-w-0 max-w-full px-1 sm:px-0">
            <LoadingSkeleton count={3} variant="list" />
          </div>
        </DashboardShell>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
