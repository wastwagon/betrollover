'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { PageHeader } from '@/components/PageHeader';
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
  const [form, setForm] = useState({
    name: '',
    price: '',
    durationDays: '30',
    roiGuaranteeEnabled: false,
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
    const roiGuaranteeMin = form.roiGuaranteeEnabled && form.roiGuaranteeMin
      ? parseFloat(form.roiGuaranteeMin)
      : null;
    if (!form.name.trim() || isNaN(price) || price < 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${getApiUrl()}/subscriptions/packages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name.trim(),
          price,
          durationDays,
          roiGuaranteeEnabled: form.roiGuaranteeEnabled,
          roiGuaranteeMin,
        }),
      });
      if (res.ok) {
        const pkg = await res.json();
        setPackages((prev) => [pkg, ...prev]);
        setForm({ name: '', price: '', durationDays: '30', roiGuaranteeEnabled: false, roiGuaranteeMin: '' });
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
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="w-full px-4 sm:px-5 md:px-6 py-6 pb-24">
        <Link href="/dashboard" className="text-sm text-[var(--primary)] hover:underline mb-4 inline-block">
          ← Dashboard
        </Link>
        <PageHeader
          label="Subscription Packages"
          title="Create Subscription Package"
          tagline="Let users subscribe to view your coupons. Funds held in escrow until period end."
        />

        <form onSubmit={handleCreate} className="glass-card rounded-2xl p-6 mb-8 border border-[var(--border)] max-w-xl">
          <h3 className="font-semibold text-[var(--text)] mb-4">New package</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Monthly Access"
                className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">Price (GHS)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="0"
                className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">Duration (days)</label>
              <select
                value={form.durationDays}
                onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)]"
              >
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">365 days</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.roiGuaranteeEnabled}
                  onChange={(e) => setForm((f) => ({ ...f, roiGuaranteeEnabled: e.target.checked }))}
                />
                <span className="text-sm font-medium text-[var(--text)]">ROI guarantee (refund if below threshold)</span>
              </label>
              {form.roiGuaranteeEnabled && (
                <input
                  type="number"
                  step="0.1"
                  value={form.roiGuaranteeMin}
                  onChange={(e) => setForm((f) => ({ ...f, roiGuaranteeMin: e.target.value }))}
                  placeholder="e.g. 20 (win rate %)"
                  className="w-full mt-2 px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)]"
                />
              )}
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
                  {pkg.roiGuaranteeEnabled && pkg.roiGuaranteeMin != null && (
                    <p className="text-xs text-[var(--text-muted)] mt-1">ROI guarantee: {pkg.roiGuaranteeMin}%</p>
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
