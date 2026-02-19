'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';

import { getApiUrl } from '@/lib/site-config';

interface AdZone {
  id: number;
  slug: string;
  name: string;
  width: number;
  height: number;
}

export default function AdminAdsCreatePage() {
  const router = useRouter();
  const [zones, setZones] = useState<AdZone[]>([]);
  const [form, setForm] = useState({
    zoneId: 0,
    advertiserName: '',
    imageUrl: '',
    targetUrl: '',
    startDate: '',
    endDate: '',
    status: 'active',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetch(`${getApiUrl()}/admin/ads/zones`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setZones(Array.isArray(data) ? data : []);
        if (data?.[0]) setForm((f) => ({ ...f, zoneId: data[0].id }));
      })
      .catch(() => []);
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token || !form.zoneId || !form.advertiserName || !form.imageUrl || !form.targetUrl || !form.startDate || !form.endDate) return;
    setSaving(true);
    try {
      const res = await fetch(`${getApiUrl()}/admin/ads/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (res.ok) router.push('/admin/ads');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 md:ml-56">
        <Link href="/admin/ads" className="text-sm text-[var(--primary)] hover:underline mb-6 inline-block">
          ← Back to Ads
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create Ad Campaign</h1>
        <form onSubmit={submit} className="max-w-2xl space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Zone *</label>
            <select
              value={form.zoneId}
              onChange={(e) => setForm((f) => ({ ...f, zoneId: parseInt(e.target.value, 10) }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              required
            >
              <option value={0}>Select zone</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name} ({z.slug}) - {z.width}×{z.height}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Advertiser Name *</label>
            <input
              type="text"
              value={form.advertiserName}
              onChange={(e) => setForm((f) => ({ ...f, advertiserName: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Image URL *</label>
            <input
              type="url"
              value={form.imageUrl}
              onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target URL *</label>
            <input
              type="url"
              value={form.targetUrl}
              onChange={(e) => setForm((f) => ({ ...f, targetUrl: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date *</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date *</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                required
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Create Campaign'}
            </button>
            <Link href="/admin/ads" className="px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
