'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getApiUrl } from '@/lib/site-config';

interface AdminSubTipster {
  tipsterUserId: number;
  username: string;
  displayName: string;
}

interface AdminSubscriptionRow {
  id: number;
  status: string;
  startedAt: string;
  endsAt: string;
  amountPaid: number;
  createdAt: string;
  escrowStatus: string | null;
  subscriber: { id: number; username: string; displayName: string };
  package: { id: number; name: string; price: number; tipsterUserId: number };
  tipster: { username: string; displayName: string; avatarUrl: string | null } | null;
}

function statusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (s === 'active') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
  if (s === 'ended') return 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200';
  if (s === 'cancelled') return 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100';
  return 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
}

function formatShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AdminSubscriptionsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<AdminSubscriptionRow[]>([]);
  const [tipsters, setTipsters] = useState<AdminSubTipster[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tipsterUserId, setTipsterUserId] = useState<string>('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadTipsters = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${getApiUrl()}/admin/subscriptions/tipsters`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setTipsters(Array.isArray(data) ? data : []))
      .catch(() => setTipsters([]));
  }, []);

  const loadRows = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
    if (tipsterUserId) params.set('tipsterUserId', tipsterUserId);
    const q = params.toString();
    const url = `${getApiUrl()}/admin/subscriptions${q ? `?${q}` : ''}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [router, statusFilter, tipsterUserId]);

  useEffect(() => {
    loadTipsters();
  }, [loadTipsters]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const handleDelete = async (row: AdminSubscriptionRow) => {
    const tip = row.tipster?.displayName ?? 'Tipster';
    const sub = row.subscriber.displayName;
    if (
      !confirm(
        `Permanently delete this subscription?\n\n• Subscriber: ${sub}\n• Package: ${row.package.name}\n• Tipster: ${tip}\n\nIf escrow is still held, the subscriber will be refunded. If payout already went to the tipster, no refund is issued. This cannot be undone.`,
      )
    ) {
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;
    setDeletingId(row.id);
    try {
      const res = await fetch(`${getApiUrl()}/admin/subscriptions/${row.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert((data as { message?: string }).message || 'Subscription removed.');
        loadRows();
      } else {
        alert((data as { message?: string }).message || 'Delete failed');
      }
    } catch {
      alert('Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <AdminSidebar />
      <main className="admin-main-sibling flex-1 w-full min-w-0 overflow-x-hidden p-6 md:p-8 md:ml-56">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">VIP subscriber purchases</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-3">
            Each row is a <strong className="text-gray-800 dark:text-gray-200">real checkout</strong>: a user who paid
            for a tipster&apos;s VIP plan. This is <strong className="text-gray-800 dark:text-gray-200">not</strong> the
            list of plans for sale — that&apos;s the public{' '}
            <Link href="/subscriptions/marketplace" className="text-[var(--primary)] hover:underline font-medium">
              VIP marketplace
            </Link>
            , which shows published packages even when no one has bought yet.
          </p>
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
            Remove rows here when you need to reverse access or clean up bad data.{' '}
            <Link href="/subscriptions/marketplace" className="text-[var(--primary)] hover:underline">
              View VIP shop as customer →
            </Link>
          </p>
          <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <label className="text-sm font-medium text-amber-900 dark:text-amber-100">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="ended">Ended</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-2">Filter by tipster:</label>
            <select
              value={tipsterUserId}
              onChange={(e) => setTipsterUserId(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 min-w-[200px]"
            >
              <option value="">All tipsters with a package</option>
              {tipsters.map((t) => (
                <option key={t.tipsterUserId} value={String(t.tipsterUserId)}>
                  {t.displayName} (@{t.username})
                </option>
              ))}
            </select>
            {tipsterUserId && (
              <button
                type="button"
                onClick={() => setTipsterUserId('')}
                className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>
          <p className="mt-3 text-xs text-amber-900/90 dark:text-amber-200/90">
            Held escrow: subscriber is refunded when you delete. Released escrow: tipster was already paid; delete only
            removes the record.
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">Loading subscriptions…</p>
            </div>
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-3xl">
              ⭐
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {tipsterUserId || statusFilter !== 'all' ? 'No matching purchases' : 'No VIP purchases yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
              {tipsterUserId || statusFilter !== 'all'
                ? 'Nothing matches the current filters.'
                : 'Nobody has completed a VIP subscription checkout yet. The public VIP marketplace can still list published plans for sale — those are packages, not customer purchases.'}
            </p>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {rows.map((row) => (
              <div
                key={row.id}
                className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
              >
                <button
                  type="button"
                  onClick={() => handleDelete(row)}
                  disabled={deletingId === row.id}
                  className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium disabled:opacity-50 z-10 shadow"
                  title="Delete subscription"
                >
                  {deletingId === row.id ? 'Deleting…' : 'Delete'}
                </button>

                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden shrink-0 flex items-center justify-center text-lg">
                    {row.tipster?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- admin; arbitrary avatar hosts
                      <img
                        src={row.tipster.avatarUrl}
                        alt=""
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <span>👤</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pr-14">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {row.tipster?.displayName ?? 'Tipster'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      @{row.tipster?.username ?? '—'}
                    </p>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col gap-2">
                  <p className="font-bold text-gray-900 dark:text-white text-lg leading-tight">{row.package.name}</p>
                  <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    GHS {row.amountPaid.toFixed(2)} paid
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${statusBadgeClass(row.status)}`}>
                      {row.status}
                    </span>
                    {row.escrowStatus && (
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 font-medium">
                        Escrow: {row.escrowStatus}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1 mt-2 border-t border-gray-100 dark:border-gray-700 pt-2">
                    <p>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Subscriber:</span>{' '}
                      {row.subscriber.displayName} (@{row.subscriber.username})
                    </p>
                    <p>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Started:</span>{' '}
                      {formatShort(row.startedAt)}
                    </p>
                    <p>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Ends:</span>{' '}
                      {formatShort(row.endsAt)}
                    </p>
                  </div>
                </div>

                {row.tipster?.username && (
                  <div className="p-3 border-t border-gray-100 dark:border-gray-700">
                    <Link
                      href={`/tipsters/${encodeURIComponent(row.tipster.username)}`}
                      className="block w-full text-center py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
                    >
                      View tipster profile
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
