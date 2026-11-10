'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/AdminSidebar';
import { AdminPageHeader, AdminStatTile } from '@/components/admin/AdminPageHeader';
import { getApiUrl } from '@/lib/site-config';
import { Input, fieldControlClassName } from '@/components/ui/Input';

interface Deposit {
  id: number;
  userId: number;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  paystackReference: string | null;
  createdAt: string;
  userDisplayName?: string | null;
  userUsername?: string | null;
  userEmail?: string | null;
}

export default function AdminDepositsPage() {
  const router = useRouter();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
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
    fetch(`${getApiUrl()}/admin/deposits?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : { items: [], total: 0, page: 1, limit: 50, totalPages: 1 }))
      .then((data) => {
        setDeposits(data.items || []);
        setTotalPages(data.totalPages || 1);
      })
      .catch(() => setDeposits([]))
      .finally(() => setLoading(false));
  }, [router, page, userIdFilter, statusFilter]);

  const updateStatus = async (id: number, status: string) => {
    if (!confirm(`Change deposit status to "${status}"?`)) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`${getApiUrl()}/admin/deposits/${id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setDeposits((d) => d.map((dep) => (dep.id === id ? { ...dep, status } : dep)));
    } else {
      alert('Failed to update status');
    }
  };

  const pendingCount = deposits.filter((d) => d.status === 'pending').length;
  const totalAmount = deposits.reduce((sum, d) => sum + Number(d.amount), 0);

  return (
    <div className="flex min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <AdminSidebar />
      <main className="admin-main-sibling section-ux-admin-main min-w-0">
        <AdminPageHeader
          title="Deposits"
          tagline="Review and approve deposit requests."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3 mb-6">
          <AdminStatTile label="Total deposits" value={deposits.length} />
          <AdminStatTile label="Pending" value={pendingCount} />
          <AdminStatTile label="Total amount" value={`GHS ${totalAmount.toFixed(2)}`} />
        </div>

        <div className="mb-6 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
          <div className="w-full sm:flex-1 sm:min-w-[160px]">
            <Input
              id="admin-deposits-user-id"
              type="number"
              placeholder="Filter by User ID"
              value={userIdFilter}
              onChange={(e) => {
                setUserIdFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by User ID"
            />
          </div>
          <select
            id="admin-deposits-status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className={fieldControlClassName(undefined, 'sm:w-auto')}
            aria-label="Filter by status"
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
            <div className="w-10 h-10 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
          </div>
        )}

        {!loading && (
          <div className="ios-grouped-section overflow-hidden">
            {deposits.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-[var(--text-muted)] text-[15px]">No deposits found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-[var(--separator)]">
                    <thead className="bg-[var(--fill-secondary)]/50">
                      <tr>
                        <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.08em]">ID</th>
                        <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.08em] min-w-[12rem]">
                          User / tipster
                        </th>
                        <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.08em]">Amount</th>
                        <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.08em]">Reference</th>
                        <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.08em]">Status</th>
                        <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.08em]">Date</th>
                        <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.08em]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-[var(--card)] divide-y divide-[var(--separator)]">
                      {deposits.map((d) => (
                        <tr key={d.id} className="hover:bg-[var(--fill-secondary)]/40 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text)]">{d.id}</td>
                          <td className="px-6 py-4 text-sm text-[var(--text)]">
                            <div className="font-semibold">
                              {d.userDisplayName?.trim() || d.userUsername || `User #${d.userId}`}
                            </div>
                            {d.userUsername ? (
                              <div className="text-xs text-[var(--text-muted)]">@{d.userUsername}</div>
                            ) : null}
                            {d.userEmail ? (
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[14rem]" title={d.userEmail}>
                                {d.userEmail}
                              </div>
                            ) : null}
                            <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5 font-mono">ID {d.userId}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-[var(--primary)]">
                            {d.currency} {Number(d.amount).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-muted)] font-mono">{d.reference}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                d.status === 'completed'
                                  ? 'bg-[var(--success)]/15 text-[var(--success)]'
                                  : d.status === 'pending'
                                  ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                                  : 'bg-[var(--destructive)]/15 text-[var(--destructive)]'
                              }`}
                            >
                              {d.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-muted)]">
                            {new Date(d.createdAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {d.status === 'pending' && (
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateStatus(d.id, 'completed')}
                                  className="px-3 py-1.5 rounded-xl bg-[var(--primary)] hover:opacity-90 text-white text-sm font-semibold transition-opacity"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateStatus(d.id, 'failed')}
                                  className="px-3 py-1.5 rounded-xl bg-[var(--destructive)] hover:opacity-90 text-white text-sm font-semibold transition-opacity"
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
                  <div className="px-6 py-4 border-t border-[var(--separator)] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[var(--fill-secondary)] text-[var(--text)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity order-2 sm:order-1"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-[var(--text-muted)] text-center order-1 sm:order-2">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[var(--fill-secondary)] text-[var(--text)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity order-3"
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
