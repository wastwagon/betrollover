'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getApiUrl } from '@/lib/site-config';

interface PayoutMethod {
  type: string;
  displayName: string;
  accountMasked: string | null;
  country?: string | null;
  currency?: string | null;
  manualDetails?: string | null;
  provider?: string | null;
  bankCode?: string | null;
}

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
  user?: { id: number; displayName: string; email: string } | null;
  payoutMethod?: PayoutMethod | null;
}

type ActionState = { type: 'none' } | { type: 'confirming_approve' } | { type: 'rejecting'; reason: string };

const STATUS_BADGE: Record<string, string> = {
  completed:  'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  pending:    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  failed:     'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  cancelled:  'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

function formatPayoutInfo(pm: PayoutMethod | null | undefined): string {
  if (!pm) return '—';
  if ((pm.type === 'manual' || pm.type === 'bank' || pm.type === 'crypto') && pm.manualDetails) {
    try {
      const d = JSON.parse(pm.manualDetails);
      const parts: string[] = [pm.displayName];
      if (d.walletAddress) parts.push(`${d.cryptoCurrency ?? 'Crypto'}: ${d.walletAddress.slice(0, 12)}…`);
      if (d.phone) parts.push(`Phone: ${d.phone}`);
      if (d.accountNumber) parts.push(`Acc: ${d.accountNumber}`);
      if (d.bankName) parts.push(`Bank: ${d.bankName}`);
      if (pm.country) parts.push(pm.country);
      if (pm.currency) parts.push(pm.currency);
      return parts.join(' · ');
    } catch { /* fallthrough */ }
  }
  return [pm.displayName, pm.accountMasked, pm.type !== 'mobile_money' ? pm.type : null]
    .filter(Boolean).join(' · ');
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminWithdrawalsPage() {
  const router = useRouter();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [userIdFilter, setUserIdFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionState, setActionState] = useState<Record<number, ActionState>>({});

  const fetchData = (pg = page) => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    setLoading(true);
    const params = new URLSearchParams({ page: pg.toString(), limit: '50' });
    if (userIdFilter) params.append('userId', userIdFilter);
    if (statusFilter) params.append('status', statusFilter);
    fetch(`${getApiUrl()}/admin/withdrawals?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : { items: [], total: 0, page: 1, limit: 50, totalPages: 1 })
      .then((data) => {
        setWithdrawals(data.items ?? []);
        setTotalPages(data.totalPages ?? 1);
        setTotalCount(data.total ?? 0);
      })
      .catch(() => setWithdrawals([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(page); }, [page, userIdFilter, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatus = async (id: number, status: string, failureReason?: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`${getApiUrl()}/admin/withdrawals/${id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, failureReason }),
    });
    if (res.ok) {
      const updated = await res.json();
      setWithdrawals((prev) =>
        prev.map((w) =>
          w.id === id ? { ...updated, user: w.user, payoutMethod: w.payoutMethod } : w
        )
      );
      setActionState((prev) => ({ ...prev, [id]: { type: 'none' } }));
    } else {
      alert('Failed to update status');
    }
  };

  const getAction = (id: number): ActionState => actionState[id] ?? { type: 'none' };
  const setAction = (id: number, state: ActionState) =>
    setActionState((prev) => ({ ...prev, [id]: state }));

  const pendingCount = withdrawals.filter((w) => w.status === 'pending').length;
  const totalAmountOnPage = withdrawals.reduce((s, w) => s + Number(w.amount), 0);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 md:ml-56">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Withdrawals Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Review and process tipster withdrawal requests. Rejecting a withdrawal automatically refunds the tipster&apos;s wallet.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white">
            <p className="text-sm opacity-90 mb-1">Total Requests</p>
            <p className="text-3xl font-bold">{totalCount}</p>
            <p className="text-xs opacity-70 mt-1">all time</p>
          </div>
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-2xl shadow-xl p-6 text-white">
            <p className="text-sm opacity-90 mb-1">Pending (this page)</p>
            <p className="text-3xl font-bold">{pendingCount}</p>
            <p className="text-xs opacity-70 mt-1">awaiting action</p>
          </div>
          <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-2xl shadow-xl p-6 text-white">
            <p className="text-sm opacity-90 mb-1">Amount (this page)</p>
            <p className="text-3xl font-bold">GHS {totalAmountOnPage.toFixed(2)}</p>
            <p className="text-xs opacity-70 mt-1">across {withdrawals.length} requests</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <input
            type="number"
            placeholder="Filter by User ID"
            value={userIdFilter}
            onChange={(e) => { setUserIdFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
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
                        {['ID', 'User', 'Amount', 'Payout Details', 'Status', 'Date', 'Actions'].map((h) => (
                          <th key={h} className="px-5 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {withdrawals.map((w) => {
                        const action = getAction(w.id);
                        return (
                          <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="px-5 py-4 whitespace-nowrap text-sm font-mono text-gray-500 dark:text-gray-400">#{w.id}</td>
                            <td className="px-5 py-4 text-sm">
                              <p className="font-medium text-gray-900 dark:text-white">{w.user?.displayName ?? `User #${w.userId}`}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{w.user?.email}</p>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-sm font-bold text-red-600 dark:text-red-400">
                              {w.currency || 'GHS'} {Number(w.amount).toFixed(2)}
                            </td>
                            <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-[200px] truncate" title={formatPayoutInfo(w.payoutMethod)}>
                              {formatPayoutInfo(w.payoutMethod)}
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${STATUS_BADGE[w.status] ?? 'bg-slate-100 text-slate-600'}`}>
                                {w.status}
                              </span>
                              {w.failureReason && (
                                <p className="text-xs text-red-500 mt-1 max-w-[120px] truncate" title={w.failureReason}>{w.failureReason}</p>
                              )}
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(w.createdAt)}
                              {w.reference && <p className="text-xs font-mono opacity-60">{w.reference.slice(0, 14)}</p>}
                            </td>

                            {/* Inline action cell */}
                            <td className="px-5 py-4 min-w-[180px]">
                              {w.status !== 'pending' ? (
                                <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                              ) : action.type === 'none' ? (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setAction(w.id, { type: 'confirming_approve' })}
                                    className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors"
                                  >
                                    ✓ Approve
                                  </button>
                                  <button
                                    onClick={() => setAction(w.id, { type: 'rejecting', reason: '' })}
                                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors"
                                  >
                                    ✗ Reject
                                  </button>
                                  <button
                                    onClick={() => setAction(w.id, { type: 'rejecting', reason: 'Cancelled by admin' })}
                                    className="px-3 py-1.5 rounded-lg bg-gray-500 hover:bg-gray-600 text-white text-xs font-semibold transition-colors"
                                  >
                                    ✗ Cancel
                                  </button>
                                </div>
                              ) : action.type === 'confirming_approve' ? (
                                <div className="space-y-1.5">
                                  <p className="text-xs font-semibold text-green-700 dark:text-green-400">Confirm payment was sent?</p>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => updateStatus(w.id, 'completed')}
                                      className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold"
                                    >
                                      Yes, Approve
                                    </button>
                                    <button
                                      onClick={() => setAction(w.id, { type: 'none' })}
                                      className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 dark:text-gray-300 text-xs hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                      Back
                                    </button>
                                  </div>
                                </div>
                              ) : action.type === 'rejecting' ? (
                                <div className="space-y-1.5">
                                  <input
                                    autoFocus
                                    placeholder="Reason (optional)"
                                    value={action.reason}
                                    onChange={(e) =>
                                      setAction(w.id, { type: 'rejecting', reason: e.target.value })
                                    }
                                    className="w-full px-2 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => updateStatus(w.id, 'failed', action.reason || undefined)}
                                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
                                    >
                                      Confirm Reject
                                    </button>
                                    <button
                                      onClick={() => setAction(w.id, { type: 'none' })}
                                      className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 dark:text-gray-300 text-xs hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                      Back
                                    </button>
                                  </div>
                                </div>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Page {page} of {totalPages}</span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
