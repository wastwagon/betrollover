'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getApiUrl } from '@/lib/site-config';

type EscrowBreakdownNote = 'refunded' | 'if_won' | 'if_period_end' | 'released';

interface MarketplaceEscrowFund {
  source?: 'marketplace_pick';
  id: number;
  userId: number;
  pickId: number;
  amount: number;
  status: string;
  reference: string;
  createdAt: string;
  buyerDisplayName?: string | null;
  buyerUsername?: string | null;
  buyerEmail?: string | null;
  tipsterDisplayName?: string | null;
  tipsterUsername?: string | null;
  tipsterUserId?: number | null;
  pickTitle?: string | null;
  tipsterShareGhs?: number;
  platformCommissionGhs?: number;
  escrowBreakdownNote?: EscrowBreakdownNote;
}

interface VipSubscriptionEscrowRow {
  source: 'vip_subscription';
  id: number;
  subscriptionId: number | null;
  userId: number;
  amount: number;
  status: string;
  createdAt: string;
  packageName: string | null;
  buyerDisplayName?: string | null;
  buyerUsername?: string | null;
  buyerEmail?: string | null;
  tipsterDisplayName?: string | null;
  tipsterUsername?: string | null;
  tipsterUserId?: number | null;
  tipsterShareGhs?: number;
  platformCommissionGhs?: number;
  escrowBreakdownNote?: EscrowBreakdownNote;
}

function formatPerson(
  displayName: string | null | undefined,
  username: string | null | undefined,
  id: number,
  email?: string | null
) {
  const name = displayName?.trim() || username || `User #${id}`;
  const handle = username ? `@${username}` : null;
  const sub = [handle, email ? email : null].filter(Boolean).join(' · ');
  return { name, sub: sub || `#${id}` };
}

function noteHint(note: EscrowBreakdownNote | undefined, kind: 'net' | 'fee') {
  if (note === 'if_won') {
    return kind === 'net' ? 'if pick wins' : 'if pick wins';
  }
  if (note === 'if_period_end') {
    return kind === 'net' ? 'at period end' : 'at period end';
  }
  if (note === 'refunded') {
    return kind === 'net' ? '— to tipster' : '— no fee';
  }
  return null;
}

export default function AdminEscrowPage() {
  const router = useRouter();
  const [funds, setFunds] = useState<MarketplaceEscrowFund[]>([]);
  const [subscriptionFunds, setSubscriptionFunds] = useState<VipSubscriptionEscrowRow[]>([]);
  const [commissionRatePercent, setCommissionRatePercent] = useState<number>(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetch(`${getApiUrl()}/admin/escrow`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) {
          setFunds([]);
          setSubscriptionFunds([]);
          return;
        }
        if (typeof data === 'object' && !Array.isArray(data)) {
          const p = Number((data as { commissionRatePercent?: number }).commissionRatePercent);
          if (!Number.isNaN(p)) setCommissionRatePercent(p);
          const d = data as { funds?: unknown; subscriptionFunds?: unknown };
          setFunds(Array.isArray(d.funds) ? d.funds : []);
          setSubscriptionFunds(Array.isArray(d.subscriptionFunds) ? d.subscriptionFunds : []);
          return;
        }
        if (Array.isArray(data)) {
          setFunds(data);
          setSubscriptionFunds([]);
          return;
        }
        setFunds([]);
        setSubscriptionFunds([]);
      })
      .catch(() => {
        setFunds([]);
        setSubscriptionFunds([]);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const pickHeld = funds.filter((f) => f.status === 'held');
  const subHeld = subscriptionFunds.filter((f) => f.status === 'held');
  const totalHeldPick = pickHeld.reduce((a, f) => a + Number(f.amount), 0);
  const totalHeldSub = subHeld.reduce((a, f) => a + Number(f.amount), 0);
  const totalHeld = totalHeldPick + totalHeldSub;
  const activeHoldings = pickHeld.length + subHeld.length;
  const hasAnyRows = funds.length > 0 || subscriptionFunds.length > 0;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <AdminSidebar />
      <main className="admin-main-sibling section-ux-admin-main">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Escrow Funds</h1>
          <p className="text-gray-600 dark:text-gray-400">
            <strong>Marketplace picks:</strong> funds held until coupons settle — released to the tipster on a win, refunded
            to buyers on loss/void. <strong>VIP subscriptions:</strong> funds held until the subscription period ends — then
            released to the tipster (minus platform fee) or refunded under the ROI guarantee. Both use the platform rate
            below for tipster net vs platform fee on release.
          </p>
          <p className="mt-2 text-sm font-medium text-amber-800 dark:text-amber-200">
            Current platform commission rate: {commissionRatePercent.toFixed(1)}% (tipster receives{' '}
            {(100 - commissionRatePercent).toFixed(1)}% of gross on release)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-2xl shadow-lg border-l-4 border-amber-500 p-6">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-2">Total held (picks + VIP)</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">GHS {totalHeld.toFixed(2)}</p>
            <p className="mt-2 text-xs text-amber-800/80 dark:text-amber-200/90">
              Pick escrow: GHS {totalHeldPick.toFixed(2)} · VIP subscription escrow: GHS {totalHeldSub.toFixed(2)}
            </p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl shadow-lg border-l-4 border-blue-500 p-6">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">Active holdings</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{activeHoldings}</p>
            <p className="mt-2 text-xs text-blue-800/80 dark:text-blue-200/90">
              {pickHeld.length} pick · {subHeld.length} VIP
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border-4 border-red-200 border-t-red-600 animate-spin" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">Loading escrow funds...</p>
            </div>
          </div>
        )}
        {!loading && (
          <div className="space-y-10">
            {!hasAnyRows ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No escrow records</h3>
                <p className="text-gray-600 dark:text-gray-400">No marketplace pick or VIP subscription escrow rows yet.</p>
              </div>
            ) : (
              <>
                {funds.length > 0 && (
                  <section>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Marketplace pick escrow</h2>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                            <tr>
                              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[10rem]">
                                Buyer
                              </th>
                              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[10rem]">
                                Tipster
                              </th>
                              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                Pick
                              </th>
                              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                Gross
                              </th>
                              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[7rem]">
                                Tipster (net)
                              </th>
                              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[7rem]">
                                Platform fee
                              </th>
                              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                Date
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {funds.map((f) => {
                              const buyer = formatPerson(f.buyerDisplayName, f.buyerUsername, f.userId, f.buyerEmail);
                              const tipsterId = f.tipsterUserId ?? 0;
                              const tipster = tipsterId
                                ? formatPerson(f.tipsterDisplayName, f.tipsterUsername, tipsterId)
                                : { name: '—', sub: 'Unknown' };
                              const netHint = noteHint(f.escrowBreakdownNote, 'net');
                              const feeHint = noteHint(f.escrowBreakdownNote, 'fee');
                              return (
                                <tr key={`pick-${f.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                                    <div className="font-medium">{buyer.name}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{buyer.sub}</div>
                                  </td>
                                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                                    <div className="font-medium">{tipster.name}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{tipster.sub}</div>
                                  </td>
                                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-white max-w-[14rem]">
                                    <div className="font-mono text-xs text-gray-600 dark:text-gray-300">#{f.pickId}</div>
                                    {f.pickTitle ? (
                                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate" title={f.pickTitle}>
                                        {f.pickTitle}
                                      </div>
                                    ) : null}
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap font-semibold text-gray-900 dark:text-white">
                                    GHS {Number(f.amount).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <div className="font-semibold text-emerald-700 dark:text-emerald-300">
                                      GHS {(f.tipsterShareGhs ?? 0).toFixed(2)}
                                    </div>
                                    {netHint ? (
                                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">{netHint}</div>
                                    ) : null}
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <div className="font-semibold text-amber-700 dark:text-amber-300">
                                      GHS {(f.platformCommissionGhs ?? 0).toFixed(2)}
                                    </div>
                                    {feeHint ? (
                                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">{feeHint}</div>
                                    ) : null}
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <span
                                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                        f.status === 'held'
                                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                                          : f.status === 'released'
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                      }`}
                                    >
                                      {f.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                    {new Date(f.createdAt).toLocaleString()}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </section>
                )}

                {subscriptionFunds.length > 0 && (
                  <section>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">VIP subscription escrow</h2>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                            <tr>
                              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[10rem]">
                                Subscriber
                              </th>
                              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[10rem]">
                                Tipster
                              </th>
                              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                Package
                              </th>
                              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                Gross
                              </th>
                              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[7rem]">
                                Tipster (net)
                              </th>
                              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[7rem]">
                                Platform fee
                              </th>
                              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                Date
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {subscriptionFunds.map((f) => {
                              const buyer = formatPerson(f.buyerDisplayName, f.buyerUsername, f.userId, f.buyerEmail);
                              const tipsterId = f.tipsterUserId ?? 0;
                              const tipster = tipsterId
                                ? formatPerson(f.tipsterDisplayName, f.tipsterUsername, tipsterId)
                                : { name: '—', sub: 'Unknown' };
                              const netHint = noteHint(f.escrowBreakdownNote, 'net');
                              const feeHint = noteHint(f.escrowBreakdownNote, 'fee');
                              return (
                                <tr key={`sub-${f.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                                    <div className="font-medium">{buyer.name}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{buyer.sub}</div>
                                  </td>
                                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                                    <div className="font-medium">{tipster.name}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{tipster.sub}</div>
                                  </td>
                                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-white max-w-[14rem]">
                                    {f.subscriptionId != null ? (
                                      <div className="font-mono text-xs text-gray-600 dark:text-gray-300">sub #{f.subscriptionId}</div>
                                    ) : null}
                                    {f.packageName ? (
                                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate" title={f.packageName}>
                                        {f.packageName}
                                      </div>
                                    ) : null}
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap font-semibold text-gray-900 dark:text-white">
                                    GHS {Number(f.amount).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <div className="font-semibold text-emerald-700 dark:text-emerald-300">
                                      GHS {(f.tipsterShareGhs ?? 0).toFixed(2)}
                                    </div>
                                    {netHint ? (
                                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">{netHint}</div>
                                    ) : null}
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <div className="font-semibold text-amber-700 dark:text-amber-300">
                                      GHS {(f.platformCommissionGhs ?? 0).toFixed(2)}
                                    </div>
                                    {feeHint ? (
                                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">{feeHint}</div>
                                    ) : null}
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <span
                                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                        f.status === 'held'
                                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                                          : f.status === 'released'
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                      }`}
                                    >
                                      {f.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                    {new Date(f.createdAt).toLocaleString()}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
