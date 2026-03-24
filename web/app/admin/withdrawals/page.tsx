'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getApiUrl } from '@/lib/site-config';
import {
  adminWithdrawalStatusBadgeClass,
  adminWithdrawalStatusLabel,
} from '@/lib/withdrawal-status';

interface PayoutMethod {
  type: string;
  displayName: string;
  accountMasked: string | null;
  country?: string | null;
  currency?: string | null;
  manualDetails?: string | null;
  provider?: string | null;
  bankCode?: string | null;
  /** Paystack / internal recipient id — admin list only */
  recipientCode?: string | null;
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
  updatedAt?: string;
  user?: {
    id: number;
    displayName: string;
    email: string;
    role?: string;
    walletBalance?: number;
    walletCurrency?: string;
  } | null;
  payoutMethod?: PayoutMethod | null;
}

type ActionState = { type: 'none' } | { type: 'confirming_approve' } | { type: 'rejecting'; reason: string };

/** Admin can complete, fail, or cancel while the request is still open (manual = pending; Paystack path = processing). */
function canAdminActOnWithdrawal(status: string): boolean {
  return status === 'pending' || status === 'processing';
}

function formatPayoutInfo(pm: PayoutMethod | null | undefined): string {
  if (!pm) return '—';
  if ((pm.type === 'manual' || pm.type === 'bank' || pm.type === 'crypto') && pm.manualDetails) {
    try {
      const d = JSON.parse(pm.manualDetails);
      const parts: string[] = [pm.displayName];
      if (d.walletAddress) parts.push(`${d.cryptoCurrency ?? 'Crypto'}: ${String(d.walletAddress).slice(0, 12)}…`);
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

function parseManualDetailsJson(manual: string | null | undefined): Record<string, string> | null {
  if (!manual?.trim()) return null;
  try {
    const o = JSON.parse(manual) as unknown;
    if (typeof o !== 'object' || o === null || Array.isArray(o)) return null;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      if (v != null && typeof v !== 'object') out[k] = String(v);
    }
    return out;
  } catch {
    return null;
  }
}

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

async function copyText(label: string, text: string) {
  try {
    await navigator.clipboard.writeText(text);
    alert(`${label} copied`);
  } catch {
    alert(text);
  }
}

function DetailRow({
  label,
  value,
  mono,
  copyLabel,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  copyLabel?: string;
}) {
  if (value == null || value === '') return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-2 border-b border-gray-100 dark:border-gray-700/80 last:border-0">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0 sm:w-36">{label}</span>
      <div className="flex-1 min-w-0 flex items-start gap-2">
        <span className={`text-sm text-gray-900 dark:text-gray-100 break-all ${mono ? 'font-mono text-[13px]' : ''}`}>
          {value}
        </span>
        {copyLabel && (
          <button
            type="button"
            onClick={() => void copyText(copyLabel, value)}
            className="shrink-0 text-xs text-red-600 dark:text-red-400 hover:underline font-medium"
          >
            Copy
          </button>
        )}
      </div>
    </div>
  );
}

function PayoutDetailModal({ w, onClose }: { w: Withdrawal; onClose: () => void }) {
  const pm = w.payoutMethod;
  const parsed = parseManualDetailsJson(pm?.manualDetails ?? undefined);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payout-detail-title"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur">
          <h2 id="payout-detail-title" className="text-lg font-bold text-gray-900 dark:text-white">
            Payout details · Withdrawal #{w.id}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Close
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-red-600 dark:text-red-400 mb-2">Request</h3>
            <DetailRow label="Amount" value={`${w.currency || 'GHS'} ${Number(w.amount).toFixed(2)}`} />
            <DetailRow label="Status" value={w.status} />
            <DetailRow label="Reference" value={w.reference ?? undefined} mono copyLabel="Reference" />
            <DetailRow label="Paystack transfer" value={w.paystackTransferCode ?? undefined} mono copyLabel="Transfer code" />
            <DetailRow label="Failure reason" value={w.failureReason ?? undefined} />
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-red-600 dark:text-red-400 mb-2">User</h3>
            <DetailRow
              label="Account type"
              value={
                w.user?.role === 'tipster'
                  ? 'Tipster'
                  : w.user?.role === 'admin'
                    ? 'Admin'
                    : w.user?.role
                      ? String(w.user.role)
                      : 'User'
              }
            />
            <DetailRow label="Name" value={w.user?.displayName ?? undefined} />
            <DetailRow label="Email" value={w.user?.email ?? undefined} copyLabel="Email" />
            <DetailRow label="User ID" value={String(w.userId)} />
            <div className="mt-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 px-4 py-3">
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 uppercase tracking-wide mb-1">
                Wallet balance (current)
              </p>
              <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
                {w.user?.walletCurrency ?? 'GHS'}{' '}
                {(w.user?.walletBalance ?? 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-2 leading-snug">
                Total in-app wallet now. For pending or processing withdrawals, the requested amount is already deducted from this balance.
              </p>
            </div>
          </section>

          {pm && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-red-600 dark:text-red-400 mb-2">Payout method</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 leading-snug">
                <strong>Account (masked)</strong> is only a short fingerprint (last digits), not encryption — it matches lists and logs safely.
                Use <strong>Saved payout details</strong> below for the full phone or account number when you send the transfer.
              </p>
              <DetailRow label="Type" value={pm.type} />
              <DetailRow label="Display name" value={pm.displayName} />
              <DetailRow label="Provider" value={pm.provider ?? undefined} />
              <DetailRow label="Bank code" value={pm.bankCode ?? undefined} mono />
              <DetailRow label="Country" value={pm.country ?? undefined} />
              <DetailRow label="Currency" value={pm.currency ?? undefined} />
              <DetailRow label="Account (masked)" value={pm.accountMasked ?? undefined} mono />
              <DetailRow
                label="Recipient code"
                value={pm.recipientCode ?? undefined}
                mono
                copyLabel="Recipient code"
              />
            </section>
          )}

          {parsed && Object.keys(parsed).length > 0 && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-red-600 dark:text-red-400 mb-2">
                Saved payout details
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Full numbers and addresses from the user&apos;s payout profile (manual / bank / crypto).
              </p>
              {Object.entries(parsed).map(([k, v]) => (
                <DetailRow
                  key={k}
                  label={humanizeKey(k)}
                  value={v}
                  mono={/phone|account|wallet|address|number|iban|swift/i.test(k)}
                  copyLabel={humanizeKey(k)}
                />
              ))}
            </section>
          )}

          {pm?.manualDetails && !parsed && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-amber-600 mb-2">Raw manual details</h3>
              <pre className="text-xs font-mono bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-all">
                {pm.manualDetails}
              </pre>
            </section>
          )}
        </div>
      </div>
    </div>
  );
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
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [detailWithdrawal, setDetailWithdrawal] = useState<Withdrawal | null>(null);

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

  /** Keep payout detail modal in sync when the list refetches (e.g. wallet balance after approve/reject). */
  useEffect(() => {
    setDetailWithdrawal((prev) => {
      if (!prev) return null;
      const fresh = withdrawals.find((x) => x.id === prev.id);
      return fresh ?? prev;
    });
  }, [withdrawals]);

  const updateStatus = async (id: number, status: string, failureReason?: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setUpdatingId(id);
    try {
      const res = await fetch(`${getApiUrl()}/admin/withdrawals/${id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, failureReason }),
      });
      if (res.ok) {
        await res.json().catch(() => ({}));
        setActionState((prev) => ({ ...prev, [id]: { type: 'none' } }));
        fetchData(page);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(typeof err?.message === 'string' ? err.message : 'Failed to update status');
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const getAction = (id: number): ActionState => actionState[id] ?? { type: 'none' };
  const setAction = (id: number, state: ActionState) =>
    setActionState((prev) => ({ ...prev, [id]: state }));

  const awaitingActionCount = withdrawals.filter((w) => canAdminActOnWithdrawal(w.status)).length;
  const totalAmountOnPage = withdrawals.reduce((s, w) => s + Number(w.amount), 0);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <AdminSidebar />
      <main className="admin-main-sibling section-ux-admin-main">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Withdrawals Management</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Review and process withdrawal requests. <strong>Reject</strong> records a <strong>Rejected</strong> status (optional reason shown to the user).{' '}
            <strong>Cancel &amp; refund</strong> records <strong>Cancelled</strong> — use when stopping the payout without a formal rejection (e.g. duplicate request). Both refund the debited amount. Users get email and in-app updates.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white">
            <p className="text-sm opacity-90 mb-1">Total Requests</p>
            <p className="text-3xl font-bold">{totalCount}</p>
            <p className="text-xs opacity-70 mt-1">all time</p>
          </div>
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-2xl shadow-xl p-6 text-white">
            <p className="text-sm opacity-90 mb-1">Awaiting action (this page)</p>
            <p className="text-3xl font-bold">{awaitingActionCount}</p>
            <p className="text-xs opacity-70 mt-1">pending or processing</p>
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
            <option value="rejected">Rejected</option>
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
                        const rowBusy = updatingId === w.id;
                        return (
                          <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="px-5 py-4 whitespace-nowrap text-sm font-mono text-gray-500 dark:text-gray-400">#{w.id}</td>
                            <td className="px-5 py-4 text-sm">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-gray-900 dark:text-white">{w.user?.displayName ?? `User #${w.userId}`}</p>
                                {w.user?.role === 'tipster' && (
                                  <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100">
                                    Tipster
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{w.user?.email}</p>
                              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
                                Wallet: {w.user?.walletCurrency ?? 'GHS'}{' '}
                                {(w.user?.walletBalance ?? 0).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </p>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-sm font-bold text-red-600 dark:text-red-400">
                              {w.currency || 'GHS'} {Number(w.amount).toFixed(2)}
                            </td>
                            <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-[min(100%,280px)]">
                              <p className="line-clamp-2 break-words" title={formatPayoutInfo(w.payoutMethod)}>
                                {formatPayoutInfo(w.payoutMethod)}
                              </p>
                              <button
                                type="button"
                                onClick={() => setDetailWithdrawal(w)}
                                className="mt-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
                              >
                                View full payout details
                              </button>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${adminWithdrawalStatusBadgeClass(w.status)}`}>
                                {adminWithdrawalStatusLabel(w.status)}
                              </span>
                              {w.failureReason && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1 max-w-[min(100%,240px)] break-words leading-snug" title={w.failureReason}>
                                  {w.failureReason}
                                </p>
                              )}
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(w.createdAt)}
                              {w.reference && <p className="text-xs font-mono opacity-60">{w.reference.slice(0, 14)}</p>}
                              {w.updatedAt &&
                                w.createdAt &&
                                new Date(w.updatedAt).getTime() !== new Date(w.createdAt).getTime() && (
                                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                                    Updated {formatDate(w.updatedAt)}
                                  </p>
                                )}
                              {w.paystackTransferCode && (
                                <p className="text-[10px] font-mono text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-[140px]" title={w.paystackTransferCode}>
                                  PS: {w.paystackTransferCode.slice(0, 18)}
                                  {w.paystackTransferCode.length > 18 ? '…' : ''}
                                </p>
                              )}
                            </td>

                            {/* Inline action cell */}
                            <td className="px-5 py-4 min-w-[180px]">
                              {rowBusy ? (
                                <span className="text-xs text-gray-500 dark:text-gray-400 inline-flex items-center gap-1">
                                  <span className="inline-block h-3 w-3 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" aria-hidden />
                                  Updating…
                                </span>
                              ) : !canAdminActOnWithdrawal(w.status) ? (
                                <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                              ) : action.type === 'none' ? (
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setAction(w.id, { type: 'confirming_approve' })}
                                    className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors"
                                  >
                                    ✓ Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setAction(w.id, { type: 'rejecting', reason: '' })}
                                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors"
                                  >
                                    ✗ Reject
                                  </button>
                                  <button
                                    type="button"
                                    title="Marks the request as Cancelled (not Rejected). Refunds the wallet — use for duplicates or if the user asked to stop, without implying a formal decline."
                                    onClick={() => {
                                      if (confirm('Cancel this withdrawal and refund the user? Status will be Cancelled (not Rejected).')) {
                                        void updateStatus(w.id, 'cancelled', 'Cancelled by admin');
                                      }
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-gray-500 hover:bg-gray-600 text-white text-xs font-semibold transition-colors"
                                  >
                                    Cancel & refund
                                  </button>
                                </div>
                              ) : action.type === 'confirming_approve' ? (
                                <div className="space-y-1.5">
                                  <p className="text-xs font-semibold text-green-700 dark:text-green-400">Confirm payment was sent?</p>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => void updateStatus(w.id, 'completed')}
                                      className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold"
                                    >
                                      Yes, Approve
                                    </button>
                                    <button
                                      type="button"
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
                                      type="button"
                                      onClick={() => void updateStatus(w.id, 'rejected', action.reason || undefined)}
                                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
                                    >
                                      Confirm Reject
                                    </button>
                                    <button
                                      type="button"
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

        {detailWithdrawal && (
          <PayoutDetailModal w={detailWithdrawal} onClose={() => setDetailWithdrawal(null)} />
        )}
      </main>
    </div>
  );
}
