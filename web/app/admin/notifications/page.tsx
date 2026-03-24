'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getApiUrl } from '@/lib/site-config';

interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  icon: string;
  isRead: boolean;
  createdAt: string;
  metadata?: {
    audience?: 'followers' | 'subscribers';
    deliveryMode?: 'teaser' | 'detailed_card';
    tipsterName?: string;
    pickTitle?: string;
  } | null;
}

interface DeliverySummaryRow {
  audience: string | null;
  deliveryMode: string | null;
  count: number;
}

export default function AdminNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [userIdFilter, setUserIdFilter] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'followers' | 'subscribers'>('all');
  const [deliveryModeFilter, setDeliveryModeFilter] = useState<'all' | 'teaser' | 'detailed_card'>('all');
  const [deliverySummary, setDeliverySummary] = useState<DeliverySummaryRow[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ page: page.toString(), limit: '50' });
    if (userIdFilter) params.append('userId', userIdFilter);
    if (audienceFilter !== 'all') params.append('audience', audienceFilter);
    if (deliveryModeFilter !== 'all') params.append('deliveryMode', deliveryModeFilter);
    fetch(`${getApiUrl()}/admin/notifications?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : { items: [], total: 0, page: 1, limit: 50, totalPages: 1 }))
      .then((data) => {
        setNotifications(data.items || []);
        setTotalPages(data.totalPages || 1);
      })
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, [router, page, userIdFilter, audienceFilter, deliveryModeFilter]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const params = new URLSearchParams({ limit: '200' });
    if (audienceFilter !== 'all') params.append('audience', audienceFilter);
    if (deliveryModeFilter !== 'all') params.append('deliveryMode', deliveryModeFilter);
    fetch(`${getApiUrl()}/admin/notifications/delivery-audit?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : { summary: [] }))
      .then((data) => {
        const summary = Array.isArray(data?.summary)
          ? data.summary.map((s: any) => ({
              audience: s.audience ?? null,
              deliveryMode: s.deliveryMode ?? null,
              count: Number(s.count ?? 0),
            }))
          : [];
        setDeliverySummary(summary);
      })
      .catch(() => setDeliverySummary([]));
  }, [audienceFilter, deliveryModeFilter]);

  const deleteNotification = async (id: number) => {
    if (!confirm('Delete this notification?')) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`${getApiUrl()}/admin/notifications/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setNotifications((n) => n.filter((not) => not.id !== id));
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <AdminSidebar />
      <main className="admin-main-sibling section-ux-admin-main">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Notifications Management</h1>
          <p className="text-gray-600 dark:text-gray-400">View and manage all platform notifications.</p>
        </div>

        <div className="mb-6 flex flex-wrap gap-4">
          <input
            type="number"
            placeholder="Filter by User ID"
            value={userIdFilter}
            onChange={(e) => {
              setUserIdFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <select
            value={audienceFilter}
            onChange={(e) => {
              setAudienceFilter(e.target.value as 'all' | 'followers' | 'subscribers');
              setPage(1);
            }}
            className="px-4 py-2 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">All audiences</option>
            <option value="followers">Followers</option>
            <option value="subscribers">Subscribers</option>
          </select>
          <select
            value={deliveryModeFilter}
            onChange={(e) => {
              setDeliveryModeFilter(e.target.value as 'all' | 'teaser' | 'detailed_card');
              setPage(1);
            }}
            className="px-4 py-2 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">All delivery modes</option>
            <option value="teaser">Teaser</option>
            <option value="detailed_card">Detailed card</option>
          </select>
        </div>

        {deliverySummary.length > 0 && (
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {deliverySummary.map((s, idx) => (
              <div
                key={`${s.audience}-${s.deliveryMode}-${idx}`}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
              >
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {(s.audience || 'unknown')} · {(s.deliveryMode || 'unknown')}
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{s.count}</p>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-10 h-10 rounded-full border-4 border-red-500 border-t-transparent animate-spin" />
          </div>
        )}

        {!loading && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {notifications.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">🔔</div>
                <p className="text-gray-600 dark:text-gray-400 text-lg">No notifications found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gradient-to-r from-red-600 to-red-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">User ID</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Title</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Message</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Type</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Routing</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {notifications.map((n) => (
                        <tr key={n.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{n.userId}</td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">{n.title}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-md truncate">{n.message}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{n.type}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded text-xs ${n.isRead ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                              {n.isRead ? 'Read' : 'Unread'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 w-fit">
                                {n.metadata?.audience || 'n/a'}
                              </span>
                              <span className="px-2 py-1 rounded text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 w-fit">
                                {n.metadata?.deliveryMode || 'n/a'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {new Date(n.createdAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => deleteNotification(n.id)}
                              className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
