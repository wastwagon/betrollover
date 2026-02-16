'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001';

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
  status: string;
}

export default function AdminAdsPage() {
  const router = useRouter();
  const [zones, setZones] = useState<AdZone[]>([]);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    Promise.all([
      fetch(`${API_URL}/admin/ads/zones`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/admin/ads/campaigns`, { headers: { Authorization: `Bearer ${token}` } }),
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
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Ads Manager</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage sponsored ads and monetization.</p>
          </div>
          <Link
            href="/admin/ads/create"
            className="px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold hover:bg-[var(--primary-hover)]"
          >
            + New Campaign
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-600">Loading...</div>
        ) : (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Ad Zones</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {zones.map((z) => (
                  <div key={z.id} className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
                    <p className="font-medium text-gray-900 dark:text-white">{z.name}</p>
                    <p className="text-sm text-gray-500">{z.slug}</p>
                    <p className="text-xs text-gray-400 mt-1">{z.width}×{z.height}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Campaigns</h2>
              {campaigns.length === 0 ? (
                <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-12 text-center">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">No campaigns yet.</p>
                  <Link href="/admin/ads/create" className="text-[var(--primary)] hover:underline">
                    Create your first campaign
                  </Link>
                </div>
              ) : (
                <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="text-left px-6 py-4 font-semibold text-gray-900 dark:text-white">Advertiser</th>
                        <th className="text-left px-6 py-4 font-semibold text-gray-900 dark:text-white">Dates</th>
                        <th className="text-left px-6 py-4 font-semibold text-gray-900 dark:text-white">Impressions</th>
                        <th className="text-left px-6 py-4 font-semibold text-gray-900 dark:text-white">Clicks</th>
                        <th className="text-left px-6 py-4 font-semibold text-gray-900 dark:text-white">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map((c) => (
                        <tr key={c.id} className="border-t border-gray-200 dark:border-gray-700">
                          <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{c.advertiserName}</td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">
                            {c.startDate} → {c.endDate}
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{c.impressions}</td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{c.clicks}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              c.status === 'active' ? 'bg-green-100 text-green-800' :
                              c.status === 'draft' ? 'bg-gray-100 text-gray-600' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
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
