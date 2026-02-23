'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';

import { getApiUrl, getAdImageUrl } from '@/lib/site-config';

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
    costPerClick: 0,
    costPerMille: 0,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch(`${getApiUrl()}/admin/ads/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (data?.imageUrl) setForm((f) => ({ ...f, imageUrl: data.imageUrl }));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

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
        body: JSON.stringify({
          ...form,
          costPerClick: form.costPerClick || 0,
          costPerMille: form.costPerMille || 0,
        }),
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
              type="text"
              value={form.imageUrl}
              onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              placeholder="https://example.com/ad.jpg or upload below"
              required
            />
            <div className="mt-2 flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                {uploading ? 'Uploading...' : 'Or upload image'}
              </label>
              <span className="text-xs text-gray-500">JPEG, PNG, WebP, GIF (max 5MB)</span>
            </div>
            {form.imageUrl && (
              <div className="mt-2 p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Preview:</p>
                <div className="relative w-full max-w-[300px] aspect-[300/250] bg-gray-200 dark:bg-gray-800 rounded overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.imageUrl.startsWith('http') ? form.imageUrl : getAdImageUrl(form.imageUrl) || form.imageUrl}
                    alt="Ad preview"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cost per Click (CPC)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.costPerClick}
                onChange={(e) => setForm((f) => ({ ...f, costPerClick: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-0.5">Amount charged per click (e.g. GHS)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cost per 1000 Impressions (CPM)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.costPerMille}
                onChange={(e) => setForm((f) => ({ ...f, costPerMille: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-0.5">Amount per 1000 impressions</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            >
              <option value="draft">Draft (hidden from site)</option>
              <option value="active">Active (visible)</option>
            </select>
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
