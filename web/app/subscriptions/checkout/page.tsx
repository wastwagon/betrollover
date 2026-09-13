'use client';

import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EscrowTrustCallout } from '@/components/EscrowTrustCallout';
import { getApiUrl } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { useT } from '@/context/LanguageContext';
import { hapticSuccess } from '@/lib/haptic';
import { Button } from '@/components/ui/Button';
import { VipPackageCadenceNote, VipPackageChannelBadge } from '@/components/VipPackageChannelBadge';

interface PackageInfo {
  id: number;
  name: string;
  price: number;
  durationDays: number;
  status: string;
  tipsterUserId?: number;
  channel?: 'house' | 'tipster';
  includedSlipsPerPeriod?: number | null;
}

function CheckoutFrame({ children }: { children: ReactNode }) {
  return (
    <DashboardShell>
      <div className="section-ux-dashboard-shell">
        <div className="mx-auto w-full min-w-0 max-w-lg">{children}</div>
      </div>
    </DashboardShell>
  );
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
      setError(t('subscriptions.checkout_error_invalid_package'));
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
          setError(t('subscriptions.checkout_error_not_available'));
          setPkg(null);
          return;
        }
        setPkg(p);
        if (w?.balance != null) setBalance(Number(w.balance));
      })
      .catch(() => setError(t('subscriptions.checkout_error_load_failed')))
      .finally(() => setLoading(false));
  }, [continueUrl, packageId, router, t]);

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
        setError(getApiErrorMessage(data, t('subscriptions.checkout_error_payment_failed')));
        return false;
      }
      hapticSuccess();
      router.push('/subscriptions?subscribed=1');
      return true;
    } catch {
      setError(t('subscriptions.checkout_error_complete_failed'));
      return false;
    } finally {
      setPaying(false);
    }
  }, [pkg, router, t]);

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
      <CheckoutFrame>
        <LoadingSkeleton count={3} variant="list" />
      </CheckoutFrame>
    );
  }

  return (
    <CheckoutFrame>
      <Link href={backHref} className="inline-block text-sm text-[var(--primary)] hover:underline mb-4">
        {t('tipster.back_to_tipsters')}
      </Link>
      <PageHeader
        label={t('subscriptions.checkout_label')}
        title={t('subscriptions.checkout_title')}
        tagline={
          pkg?.channel === 'house'
            ? t('subscriptions.checkout_tagline_house')
            : t('subscriptions.checkout_tagline')
        }
      />
      <EscrowTrustCallout
        className="mb-4"
        title={t('subscriptions.trust_callout_title')}
        body={t('subscriptions.trust_callout_body')}
        linkLabel={t('subscriptions.marketplace_link_escrow')}
        linkHref="/guides/escrow-refunds"
      />

      {error && (
        <div className="mb-4 p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 text-sm">
          {error}
        </div>
      )}

      {pkg && (
        <div className="rounded-2xl p-5 sm:p-6 border border-[var(--separator)] bg-[var(--card)] shadow-sm space-y-4 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-[var(--text)] break-words">{pkg.name}</h2>
              <VipPackageChannelBadge channel={pkg.channel} />
            </div>
            <p className="text-2xl font-bold text-[var(--primary)] mt-2 tabular-nums">
              GHS {price.toFixed(2)} / {t('subscriptions.checkout_days', { n: String(pkg.durationDays) })}
            </p>
            <VipPackageCadenceNote
              className="text-xs text-[var(--text-muted)] mt-2 leading-snug"
              channel={pkg.channel}
              includedSlipsPerPeriod={pkg.includedSlipsPerPeriod}
              durationDays={pkg.durationDays}
            />
            <p className="text-xs text-[var(--text-muted)] mt-2 leading-snug">
              {pkg.channel === 'house'
                ? t('subscriptions.checkout_house_includes')
                : t('subscriptions.checkout_tipster_includes')}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-2 leading-snug">
              {t('subscriptions.period_end_split')}
            </p>
          </div>
          <div className="text-sm text-[var(--text-muted)]">
            {t('subscriptions.checkout_wallet_balance')}{' '}
            <span className="font-medium text-[var(--text)] tabular-nums">
              {balance !== null ? `GHS ${balance.toFixed(2)}` : '—'}
            </span>
          </div>
          {balance !== null && balance < price && price > 0 && (
            <p className="text-sm text-[var(--text-muted)]">
              {t('subscriptions.checkout_topup_hint')}{' '}
              <Link href={walletTopUpHref} className="text-[var(--primary)] font-medium hover:underline">
                {t('subscriptions.checkout_topup_cta')}
              </Link>
            </p>
          )}
          {autoSubscribe && canPay && (
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              {t('subscriptions.checkout_auto_processing')}
            </p>
          )}
          <Button
            type="button"
            onClick={() => void pay()}
            disabled={paying || !canPay}
            fullWidth
          >
            {paying ? t('subscriptions.checkout_processing') : t('subscriptions.checkout_pay_cta')}
          </Button>
        </div>
      )}
    </CheckoutFrame>
  );
}

export default function SubscriptionCheckoutPage() {
  return (
    <Suspense
      fallback={
        <CheckoutFrame>
          <LoadingSkeleton count={3} variant="list" />
        </CheckoutFrame>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
