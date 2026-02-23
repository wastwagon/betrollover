'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';

import { getApiUrl, TELEGRAM_ADS_URL } from '@/lib/site-config';

const BarChart = dynamic(() => import('recharts').then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then((m) => m.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then((m) => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then((m) => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then((m) => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then((m) => m.ResponsiveContainer), { ssr: false });
const PieChart = dynamic(() => import('recharts').then((m) => m.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then((m) => m.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then((m) => m.Cell), { ssr: false });
const Legend = dynamic(() => import('recharts').then((m) => m.Legend), { ssr: false });

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

interface AdZone {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  width: number;
  height: number;
}

interface AdCampaign {
  id: number;
  zoneId: number;
  advertiserName: string;
  imageUrl: string;
  targetUrl: string;
  startDate: string;
  endDate: string;
  impressions: number;
  clicks: number;
  costPerClick?: number;
  costPerMille?: number;
  status: string;
  zone?: { slug: string; name: string };
}

export default function AdminAdsPage() {
  const router = useRouter();
  const [zones, setZones] = useState<AdZone[]>([]);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoneFilter, setZoneFilter] = useState<number | 'all'>('all');
  const [deleting, setDeleting] = useState<number | null>(null);
  const [duplicating, setDuplicating] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkActioning, setBulkActioning] = useState(false);

  const filteredCampaigns = zoneFilter === 'all'
    ? campaigns
    : campaigns.filter((c) => c.zoneId === zoneFilter);

  const zoneRevenueData = zones
    .map((z) => {
      const zoneCampaigns = campaigns.filter((c) => c.zoneId === z.id);
      const totalRevenue = zoneCampaigns.reduce((s, c) => {
        const cpc = Number(c.costPerClick ?? 0);
        const cpm = Number(c.costPerMille ?? 0);
        const imp = c.impressions ?? 0;
        const clk = c.clicks ?? 0;
        return s + (imp / 1000) * cpm + clk * cpc;
      }, 0);
      return { name: z.name, value: totalRevenue };
    })
    .filter((d) => d.value > 0);

  const totals = {
    impressions: campaigns.reduce((s, c) => s + (c.impressions ?? 0), 0),
    clicks: campaigns.reduce((s, c) => s + (c.clicks ?? 0), 0),
    revenue: campaigns.reduce((s, c) => {
      const cpc = Number(c.costPerClick ?? 0);
      const cpm = Number(c.costPerMille ?? 0);
      const imp = c.impressions ?? 0;
      const clk = c.clicks ?? 0;
      return s + (imp / 1000) * cpm + clk * cpc;
    }, 0),
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this campaign? This cannot be undone.')) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setDeleting(id);
    try {
      const res = await fetch(`${getApiUrl()}/admin/ads/campaigns/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  const exportCsv = () => {
    const headers = ['Advertiser', 'Zone', 'Start Date', 'End Date', 'Impressions', 'Clicks', 'CTR %', 'CPC', 'CPM', 'Est. Revenue', 'Status'];
    const rows = campaigns.map((c) => {
      const imp = c.impressions ?? 0;
      const clk = c.clicks ?? 0;
      const ctr = imp > 0 ? ((clk / imp) * 100).toFixed(2) : '';
      const cpc = Number(c.costPerClick ?? 0);
      const cpm = Number(c.costPerMille ?? 0);
      const revenue = (imp / 1000) * cpm + clk * cpc;
      const zoneName = c.zone?.name ?? zones.find((z) => z.id === c.zoneId)?.name ?? String(c.zoneId);
      return [c.advertiserName, zoneName, c.startDate, c.endDate, imp, clk, ctr, cpc, cpm, revenue.toFixed(2), c.status];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ads-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCampaigns.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCampaigns.map((c) => c.id)));
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0 || !confirm(`Delete ${selectedIds.size} campaign(s)? This cannot be undone.`)) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setBulkActioning(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`${getApiUrl()}/admin/ads/campaigns/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
        )
      );
      setCampaigns((prev) => prev.filter((c) => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
    } finally {
      setBulkActioning(false);
    }
  };

  const bulkSetStatus = async (status: string) => {
    if (selectedIds.size === 0) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setBulkActioning(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`${getApiUrl()}/admin/ads/campaigns/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ status }),
          })
        )
      );
      setCampaigns((prev) =>
        prev.map((c) => (selectedIds.has(c.id) ? { ...c, status } : c))
      );
      setSelectedIds(new Set());
    } finally {
      setBulkActioning(false);
    }
  };

  const handleDuplicate = async (c: AdCampaign) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setDuplicating(c.id);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      const res = await fetch(`${getApiUrl()}/admin/ads/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          zoneId: c.zoneId,
          advertiserName: `${c.advertiserName} (Copy)`,
          imageUrl: c.imageUrl,
          targetUrl: c.targetUrl,
          startDate: today,
          endDate: endDate.toISOString().slice(0, 10),
          status: 'draft',
          costPerClick: c.costPerClick ?? 0,
          costPerMille: c.costPerMille ?? 0,
        }),
      });
      if (res.ok) {
        const newCampaign = await res.json();
        setCampaigns((prev) => [{ ...newCampaign, zone: c.zone }, ...prev]);
      }
    } finally {
      setDuplicating(null);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    Promise.all([
      fetch(`${getApiUrl()}/admin/ads/zones`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${getApiUrl()}/admin/ads/campaigns`, { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(([r1, r2]) => Promise.all([r1.json(), r2.json()]))
      .then(([z, c]) => {
        setZones(Array.isArray(z) ? z : []);
        setCampaigns(Array.isArray(c) ? c : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 md:ml-56">
        <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Ads Manager</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage sponsored ads and monetization.</p>
            <div className="mt-3 p-4 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800">
              <p className="text-sm font-medium text-sky-800 dark:text-sky-200 mb-1">Advertising inquiries</p>
              <p className="text-sm text-sky-700 dark:text-sky-300 mb-2">Interested companies who want to advertise in these spaces should contact us on Telegram.</p>
              <a
                href={TELEGRAM_ADS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
                Contact on Telegram
              </a>
            </div>
          </div>
          <div className="flex gap-2">
            {campaigns.length > 0 && (
              <button
                type="button"
                onClick={exportCsv}
                className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Export CSV
              </button>
            )}
            <Link
              href="/admin/ads/create"
              className="px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold hover:bg-[var(--primary-hover)]"
            >
              + New Campaign
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-600">Loading...</div>
        ) : (
          <div className="space-y-8">
            {/* Overall summary */}
            {campaigns.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Impressions</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totals.impressions.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Clicks</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totals.clicks.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Overall CTR</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : '—'}%
                  </p>
                </div>
                <div className="rounded-xl bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800 p-4">
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Est. Total Revenue</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {totals.revenue > 0 ? `GHS ${totals.revenue.toFixed(2)}` : '—'}
                  </p>
                </div>
              </div>
            )}

            {/* Charts */}
            {campaigns.length > 0 && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Campaigns by Impressions</h3>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[...filteredCampaigns]
                          .map((c) => ({
                            name: c.advertiserName.length > 20 ? c.advertiserName.slice(0, 20) + '…' : c.advertiserName,
                            impressions: c.impressions ?? 0,
                            revenue: (() => {
                              const cpc = Number(c.costPerClick ?? 0);
                              const cpm = Number(c.costPerMille ?? 0);
                              const imp = c.impressions ?? 0;
                              const clk = c.clicks ?? 0;
                              return (imp / 1000) * cpm + clk * cpc;
                            })(),
                          }))
                          .sort((a, b) => b.impressions - a.impressions)
                          .slice(0, 8)}
                        margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-600" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(value: unknown) => [typeof value === 'number' ? value.toLocaleString() : String(value ?? ''), 'Impressions']}
                          contentStyle={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }}
                        />
                        <Bar dataKey="impressions" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue by Zone</h3>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={zoneRevenueData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => ((percent ?? 0) > 0.05 ? `${name} ${((percent ?? 0) * 100).toFixed(0)}%` : '')}
                        >
                          {zoneRevenueData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: unknown) => [`GHS ${typeof value === 'number' ? value.toFixed(2) : '0.00'}`, 'Revenue']}
                          contentStyle={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Ad Zones & Analytics</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {zones.map((z) => {
                  const zoneCampaigns = campaigns.filter((c) => c.zoneId === z.id);
                  const totalImpressions = zoneCampaigns.reduce((s, c) => s + (c.impressions ?? 0), 0);
                  const totalClicks = zoneCampaigns.reduce((s, c) => s + (c.clicks ?? 0), 0);
                  const totalRevenue = zoneCampaigns.reduce((s, c) => {
                    const cpc = Number(c.costPerClick ?? 0);
                    const cpm = Number(c.costPerMille ?? 0);
                    const imp = c.impressions ?? 0;
                    const clk = c.clicks ?? 0;
                    return s + (imp / 1000) * cpm + clk * cpc;
                  }, 0);
                  return (
                    <div key={z.id} className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
                      <p className="font-medium text-gray-900 dark:text-white">{z.name}</p>
                      <p className="text-sm text-gray-500">{z.slug}</p>
                      <p className="text-xs text-gray-400 mt-1">{z.width}×{z.height}</p>
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-1 text-xs">
                        <p className="text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Impressions:</span> {totalImpressions.toLocaleString()}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Clicks:</span> {totalClicks.toLocaleString()}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400">
                          <span className="font-medium">CTR:</span>{' '}
                          {totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '—'}%
                        </p>
                        <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                          <span className="text-gray-600 dark:text-gray-400">Est. Revenue:</span>{' '}
                          {totalRevenue > 0 ? `GHS ${totalRevenue.toFixed(2)}` : '—'}
                        </p>
                        <p className="text-gray-500 dark:text-gray-500">
                          {zoneCampaigns.length} campaign{zoneCampaigns.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Campaigns & Analytics</h2>
                {campaigns.length > 0 && (
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600 dark:text-gray-400">Filter by zone:</label>
                    <select
                      value={zoneFilter}
                      onChange={(e) => setZoneFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                    >
                      <option value="all">All zones</option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>{z.name}</option>
                      ))}
                    </select>
                    </div>
                    {selectedIds.size > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{selectedIds.size} selected</span>
                        <button
                          type="button"
                          onClick={bulkDelete}
                          disabled={bulkActioning}
                          className="px-3 py-1.5 rounded-lg text-sm text-red-600 border border-red-300 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-900/20 disabled:opacity-50"
                        >
                          Delete
                        </button>
                        <select
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v) bulkSetStatus(v);
                            e.target.value = '';
                          }}
                          disabled={bulkActioning}
                          className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                        >
                          <option value="">Set status...</option>
                          <option value="draft">Draft</option>
                          <option value="active">Active</option>
                          <option value="paused">Paused</option>
                          <option value="ended">Ended</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setSelectedIds(new Set())}
                          className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {campaigns.length === 0 ? (
                <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-12 text-center">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">No campaigns yet.</p>
                  <Link href="/admin/ads/create" className="text-[var(--primary)] hover:underline">
                    Create your first campaign
                  </Link>
                </div>
              ) : (
                <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-4 py-4 w-10">
                          <input
                            type="checkbox"
                            checked={filteredCampaigns.length > 0 && selectedIds.size === filteredCampaigns.length}
                            onChange={toggleSelectAll}
                            className="rounded border-gray-300"
                          />
                        </th>
                        <th className="text-left px-6 py-4 font-semibold text-gray-900 dark:text-white">Advertiser</th>
                        <th className="text-left px-6 py-4 font-semibold text-gray-900 dark:text-white">Zone</th>
                        <th className="text-left px-6 py-4 font-semibold text-gray-900 dark:text-white">Dates</th>
                        <th className="text-right px-6 py-4 font-semibold text-gray-900 dark:text-white">Impressions</th>
                        <th className="text-right px-6 py-4 font-semibold text-gray-900 dark:text-white">Clicks</th>
                        <th className="text-right px-6 py-4 font-semibold text-gray-900 dark:text-white">CTR</th>
                        <th className="text-right px-6 py-4 font-semibold text-gray-900 dark:text-white">Est. Revenue</th>
                        <th className="text-left px-6 py-4 font-semibold text-gray-900 dark:text-white">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCampaigns.map((c) => {
                        const cpc = Number(c.costPerClick ?? 0);
                        const cpm = Number(c.costPerMille ?? 0);
                        const imp = c.impressions ?? 0;
                        const clk = c.clicks ?? 0;
                        const ctr = imp > 0 ? ((clk / imp) * 100).toFixed(2) : '—';
                        const estRevenue = (imp / 1000) * cpm + clk * cpc;
                        return (
                          <tr key={c.id} className="border-t border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(c.id)}
                                onChange={() => toggleSelect(c.id)}
                                className="rounded border-gray-300"
                              />
                            </td>
                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{c.advertiserName}</td>
                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">
                              {c.zone?.name ?? zones.find((z) => z.id === c.zoneId)?.slug ?? c.zoneId}
                            </td>
                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">
                              {c.startDate} → {c.endDate}
                            </td>
                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-right tabular-nums">{imp.toLocaleString()}</td>
                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-right tabular-nums">{clk.toLocaleString()}</td>
                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-right tabular-nums">{ctr}{ctr !== '—' ? '%' : ''}</td>
                            <td className="px-6 py-4 text-right font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {estRevenue > 0 ? `GHS ${estRevenue.toFixed(2)}` : '—'}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                c.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                c.status === 'draft' ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              }`}>
                                {c.status}
                              </span>
                              <Link
                                href={`/admin/ads/${c.id}/edit`}
                                className="ml-2 text-xs text-[var(--primary)] hover:underline"
                              >
                                Edit
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDuplicate(c)}
                                disabled={duplicating === c.id}
                                className="ml-2 text-xs text-blue-600 hover:underline disabled:opacity-50"
                              >
                                {duplicating === c.id ? '…' : 'Duplicate'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(c.id)}
                                disabled={deleting === c.id}
                                className="ml-2 text-xs text-red-600 hover:underline disabled:opacity-50"
                              >
                                {deleting === c.id ? '…' : 'Delete'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
