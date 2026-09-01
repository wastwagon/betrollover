'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';

import { getApiUrl, getAdImageUrl } from '@/lib/site-config';
import { buttonClassName } from '@/components/ui/Button';
import { Input, Field, fieldControlClassName } from '@/components/ui/Input';

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
    <div className="flex min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <AdminSidebar />
      <main className="admin-main-sibling section-ux-admin-main min-w-0">
        <Link href="/admin/ads" className="text-sm text-[var(--primary)] hover:underline mb-6 inline-block">
          ← Back to Ads
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">Create Ad Campaign</h1>
        <form onSubmit={submit} className="max-w-2xl space-y-4">
          <Field label="Zone *" htmlFor="ad-zone">
            <select
              id="ad-zone"
              value={form.zoneId}
              onChange={(e) => setForm((f) => ({ ...f, zoneId: parseInt(e.target.value, 10) }))}
              className={fieldControlClassName()}
              required
            >
              <option value={0}>Select zone</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name} ({z.slug}) - {z.width}×{z.height}</option>
              ))}
            </select>
          </Field>
          <Input
            id="ad-advertiser"
            label="Advertiser Name *"
            type="text"
            value={form.advertiserName}
            onChange={(e) => setForm((f) => ({ ...f, advertiserName: e.target.value }))}
            required
          />
          <Input
            id="ad-image"
            label="Image URL *"
            type="text"
            value={form.imageUrl}
            onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
            placeholder="https://example.com/ad.jpg or upload below"
            required
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <label className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 text-sm w-full sm:w-auto">
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                {uploading ? 'Uploading...' : 'Or upload image'}
              </label>
              <span className="text-xs text-gray-500">JPEG, PNG, WebP, GIF (max 5MB)</span>
            </div>
            {form.imageUrl && (
              <div className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
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
          <Input
            id="ad-target"
            label="Target URL *"
            type="url"
            value={form.targetUrl}
            onChange={(e) => setForm((f) => ({ ...f, targetUrl: e.target.value }))}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="ad-cpc"
              label="Cost per Click (CPC)"
              type="number"
              min={0}
              step={0.01}
              value={form.costPerClick}
              onChange={(e) => setForm((f) => ({ ...f, costPerClick: parseFloat(e.target.value) || 0 }))}
              placeholder="0.00"
              hint="Amount charged per click (e.g. GHS)"
            />
            <Input
              id="ad-cpm"
              label="Cost per 1000 Impressions (CPM)"
              type="number"
              min={0}
              step={0.01}
              value={form.costPerMille}
              onChange={(e) => setForm((f) => ({ ...f, costPerMille: parseFloat(e.target.value) || 0 }))}
              placeholder="0.00"
              hint="Amount per 1000 impressions"
            />
          </div>
          <Field label="Status" htmlFor="ad-status">
            <select
              id="ad-status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className={fieldControlClassName()}
            >
              <option value="draft">Draft (hidden from site)</option>
              <option value="active">Active (visible)</option>
            </select>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="ad-start"
              label="Start Date *"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              required
            />
            <Input
              id="ad-end"
              label="End Date *"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              required
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center pt-4">
            <button
              type="submit"
              disabled={saving}
              className={buttonClassName({ className: 'w-full sm:w-auto' })}
            >
              {saving ? 'Saving...' : 'Create Campaign'}
            </button>
            <Link href="/admin/ads" className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
