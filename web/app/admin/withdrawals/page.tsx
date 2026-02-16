'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/AdminSidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001';

interface Withdrawal {
  id: number;
  userId: number;
  payoutMethodId: number;
  amount: number;
  currency: string;
  status: string;
  reference: string | null;
  paystackTransferCode: string | null;
  failureReason: string | null;
  createdAt: string;
}

export default function AdminWithdrawalsPage() {
  const router = useRouter();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [userIdFilter, setUserIdFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ page: page.toString(), limit: '50' });
    if (userIdFilter) params.append('userId', userIdFilter);
    if (statusFilter) params.append('status', statusFilter);
    fetch(`${API_URL}/admin/withdrawals?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : { items: [], total: 0, page: 1, limit: 50, totalPages: 1 }))
      .then((data) => {
        setWithdrawals(data.items || []);
        setTotalPages(data.totalPages || 1);
      })
      .catch(() => setWithdrawals([]))
      .finally(() => setLoading(false));
  }, [router, page, userIdFilter, statusFilter]);

  const updateStatus = async (id: number, status: string, failureReason?: string) => {
    if (!confirm(`Change withdrawal status to "${status}"?`)) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`${API_URL}/admin/withdrawals/${id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, failureReason }),
    });
    if (res.ok) {
      const updated = await res.json();
      setWithdrawals((w) => w.map((withdrawal) => (withdrawal.id === id ? updated : withdrawal)));
    } else {
      alert('Failed to update status');
    }
  };

  const pendingCount = withdrawals.filter((w) => w.status === 'pending').length;
  const totalAmount = withdrawals.reduce((sum, w) => sum + Number(w.amount), 0);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 md:ml-56">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Withdrawals Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Review and process withdrawal requests.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white">
            <p className="text-sm opacity-90 mb-1">Total Withdrawals</p>
            <p className="text-3xl font-bold">{withdrawals.length}</p>
          </div>
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-2xl shadow-xl p-6 text-white">
            <p className="text-sm opacity-90 mb-1">Pending</p>
            <p className="text-3xl font-bold">{pendingCount}</p>
          </div>
          <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-2xl shadow-xl p-6 text-white">
            <p className="text-sm opacity-90 mb-1">Total Amount</p>
            <p className="text-3xl font-bold">GHS {totalAmount.toFixed(2)}</p>
          </div>
        </div>

        <div className="mb-6 flex gap-4">
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
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-10 h-10 rounded-full border-4 border-red-500 border-t-transparent animate-spin" />
          </div>
        )}

        {!loading && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {withdrawals.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">💸</div>
                <p className="text-gray-600 dark:text-gray-400 text-lg">No withdrawals found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gradient-to-r from-red-600 to-red-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">ID</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">User ID</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Reference</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {withdrawals.map((w) => (
                        <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{w.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{w.userId}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600 dark:text-red-400">
                            {w.currency} {Number(w.amount).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                w.status === 'completed'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : w.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}
                            >
                              {w.status}
                            </span>
                            {w.failureReason && (
                              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{w.failureReason}</p>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 font-mono">
                            {w.reference || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {new Date(w.createdAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {w.status === 'pending' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => updateStatus(w.id, 'completed')}
                                  className="px-3 py-1 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    const reason = prompt('Failure reason:');
                                    if (reason) updateStatus(w.id, 'failed', reason);
                                  }}
                                  className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
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
