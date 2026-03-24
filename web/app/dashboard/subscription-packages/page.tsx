'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { SuccessToast } from '@/components/SuccessToast';
import { useToast } from '@/hooks/useToast';
import { getApiUrl } from '@/lib/site-config';

interface SubscriptionPackage {
  id: number;
  name: string;
  price: number;
  durationDays: number;
  roiGuaranteeMin?: number | null;
  roiGuaranteeEnabled: boolean;
  status: string;
}

export default function SubscriptionPackagesPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { showSuccess, clearSuccess, success: toastSuccess } = useToast();
  const [form, setForm] = useState({
    name: '',
    price: '',
    durationDays: '30',
    roiGuaranteeMin: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login?redirect=/dashboard/subscription-packages');
      return;
    }
    fetch(`${getApiUrl()}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok || r.status === 401) {
          router.push('/login?redirect=/dashboard/subscription-packages');
          return null;
        }
        return r.json();
      })
      .then((user) => {
        if (!user?.id) return;
        return fetch(`${getApiUrl()}/subscriptions/packages?tipsterId=${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      })
      .then((r) => (r?.ok ? r.json() : []))
      .then((arr) => setPackages(Array.isArray(arr) ? arr : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;
    const price = parseFloat(form.price);
    const durationDays = parseInt(form.durationDays, 10) || 30;
    const roiGuaranteeMin = parseFloat(form.roiGuaranteeMin);
    if (!form.name.trim() || isNaN(price) || price < 0 || isNaN(roiGuaranteeMin) || roiGuaranteeMin < 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${getApiUrl()}/subscriptions/packages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name.trim(),
          price,
          durationDays,
          roiGuaranteeEnabled: true,
          roiGuaranteeMin,
        }),
      });
      if (res.ok) {
        const pkg = await res.json();
        setPackages((prev) => [pkg, ...prev]);
        setForm({ name: '', price: '', durationDays: '30', roiGuaranteeMin: '' });
        showSuccess('Subscription package created successfully!');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || 'Failed to create package');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="w-full px-4 sm:px-5 md:px-6 py-6 pb-24">
          <LoadingSkeleton count={2} variant="list" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      {toastSuccess ? <SuccessToast message={toastSuccess} onClose={clearSuccess} /> : null}
      <div className="w-full px-4 sm:px-5 md:px-6 py-6 pb-24">
        <Link href="/dashboard" className="text-sm text-[var(--primary)] hover:underline mb-4 inline-block">
          ← Dashboard
        </Link>
        <PageHeader
          label="Subscription Packages"
          title="VIP subscription package"
          tagline="One active VIP channel per tipster. Subscribers pay from wallet; funds follow your escrow rules."
        />
        <p className="text-sm text-[var(--text-muted)] mb-4 max-w-xl border border-amber-200/80 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl px-4 py-3">
          You need at least <strong className="text-[var(--text)]">20% ROI</strong> (from your settled coupons) to create a VIP package — same standard as selling paid picks on the marketplace.
        </p>

        {packages.length > 0 && (
          <p className="text-sm text-[var(--text-muted)] mb-4 max-w-xl">
            You already have an active VIP package. The platform allows one active VIP channel per tipster.
          </p>
        )}

        {packages.length === 0 && (
        <form onSubmit={handleCreate} className="glass-card rounded-2xl p-6 mb-8 border border-[var(--border)] max-w-xl">
          <h3 className="font-semibold text-[var(--text)] mb-4">New package</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                Name <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Monthly Access"
                className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)]"
                required
                aria-required="true"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                Price (GHS) <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="0"
                className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)]"
                required
                aria-required="true"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                Duration (days) <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <select
                value={form.durationDays}
                onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)]"
                required
                aria-required="true"
              >
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">365 days</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                ROI guarantee threshold (%) <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <p className="text-xs text-[var(--text-muted)] mb-1.5">
                Minimum win-rate % subscribers must reach for the period; refunds apply if results fall below this (per your package rules).
              </p>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={form.roiGuaranteeMin}
                onChange={(e) => setForm((f) => ({ ...f, roiGuaranteeMin: e.target.value }))}
                placeholder="e.g. 20"
                className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)]"
                required
                aria-required="true"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create package'}
            </button>
          </div>
        </form>
        )}

        <section>
          <h3 className="font-semibold text-[var(--text)] mb-4">Your packages</h3>
          {packages.length === 0 ? (
            <p className="text-[var(--text-muted)]">No packages yet. Create one above.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="rounded-xl p-4 border border-[var(--border)] bg-[var(--card)]"
                >
                  <h4 className="font-semibold text-[var(--text)]">{pkg.name}</h4>
                  <p className="text-lg font-bold text-[var(--primary)]">GHS {Number(pkg.price).toFixed(2)}/{pkg.durationDays}d</p>
                  {(pkg.roiGuaranteeMin != null || pkg.roiGuaranteeEnabled) && (
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      ROI guarantee threshold:{' '}
                      {pkg.roiGuaranteeMin != null ? `${Number(pkg.roiGuaranteeMin)}%` : '—'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
