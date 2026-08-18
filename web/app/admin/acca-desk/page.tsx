'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getApiUrl } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { emitAuthStorageSync } from '@/lib/auth-storage-sync';
import { Button, buttonClassName } from '@/components/ui/Button';

type RosterRow = {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  riskLevel: string;
  markets: string[];
  legs: number;
  strategyId: string;
  isActive: boolean;
  userId: number | null;
  tipsterId: number | null;
  setup: boolean;
};

type TodayTicket = {
  id: number;
  title: string;
  username: string;
  displayName: string;
  totalOdds: number;
  totalPicks: number;
  status: string;
  createdAt: string;
  legs: { matchDescription: string; prediction: string; odds: number }[];
};

type Overview = {
  enabled: boolean;
  cron: string;
  timezone: string;
  legs: number;
  maxPerDay?: number;
  timeSlots?: string[];
  rosterSize: number;
  setupCount: number;
  activeCount: number;
  todayPublished: number;
  syncStatus: {
    status: string;
    lastSyncAt?: string | null;
    lastSyncCount?: number | null;
    lastError?: string | null;
  } | null;
  roster: RosterRow[];
  todayTickets: TodayTicket[];
};

type RunResult = {
  enabled: boolean;
  published: number;
  skippedAlreadyPosted: number;
  skippedEmptyPool: number;
  skippedNoUser: number;
  errors: number;
  details: { username: string; status: string; ticketId?: number; slotKey?: string; message?: string }[];
};

function formatWhen(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export default function AdminAccaDeskPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [settingUp, setSettingUp] = useState(false);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<RunResult | null>(null);
  const [impersonating, setImpersonating] = useState<number | null>(null);

  const impersonateUser = async (userId: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setImpersonating(userId);
    setMessage(null);
    try {
      const res = await fetch(`${getApiUrl()}/admin/users/${userId}/impersonate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        emitAuthStorageSync();
        window.location.href = '/dashboard';
        return;
      }
      setMessage({ type: 'error', text: getApiErrorMessage(data, `Impersonation failed (${res.status})`) });
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message || 'Impersonation failed' });
    } finally {
      setImpersonating(null);
    }
  };

  const loadData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/admin/acca-desk/overview`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setOverview(data as Overview);
      } else {
        setMessage({ type: 'error', text: getApiErrorMessage(data, 'Failed to load Acca Desk overview') });
      }
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message || 'Failed to load Acca Desk overview' });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSetup = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setSettingUp(true);
    setMessage(null);
    try {
      const res = await fetch(`${getApiUrl()}/admin/setup/acca-desk-tipsters`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({
          type: 'success',
          text: `Acca Desk tipsters ready: ${data.created ?? 0} created, ${data.updated ?? 0} updated (roster ${data.total ?? 0}).`,
        });
        await loadData();
      } else {
        setMessage({ type: 'error', text: getApiErrorMessage(data, 'Setup failed') });
      }
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message || 'Setup failed' });
    } finally {
      setSettingUp(false);
    }
  };

  const handleRunDaily = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setRunning(true);
    setMessage(null);
    try {
      const res = await fetch(`${getApiUrl()}/admin/acca-desk/run-daily`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const r = data as RunResult;
        setLastRun(r);
        if (!r.enabled) {
          setMessage({ type: 'error', text: 'Acca Desk is disabled (ACCA_DESK_ENABLED=false).' });
        } else {
          setMessage({
            type: r.errors > 0 ? 'error' : 'success',
            text: `Published ${r.published} · already posted ${r.skippedAlreadyPosted} · empty pool ${r.skippedEmptyPool} · errors ${r.errors}`,
          });
        }
        await loadData();
      } else {
        setMessage({ type: 'error', text: getApiErrorMessage(data, 'Daily run failed') });
      }
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message || 'Daily run failed' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <AdminSidebar />
      <main className="admin-main-sibling section-ux-admin-main min-w-0">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Acca Desk</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Acca Desk tipsters including specialised Over 1.5 and Over 2.5 at Sure / Safe / Medium / High, plus
            Sure / Safe / Medium × 1X2, DC, BTTS, Mix. Each posts up to 3 free 2-folds daily (early / afternoon /
            evening), clustered by kick-off. All generated at cron{' '}
            {overview?.cron || '30 0 * * *'} ({overview?.timezone || 'Africa/Accra'}).
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 px-4 py-3 rounded-xl ${
              message.type === 'success'
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200'
                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mb-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSetup}
            disabled={settingUp || running}
            className={buttonClassName({ variant: 'secondary' })}
          >
            {settingUp ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Setting up…
              </>
            ) : (
              <>Setup Acca Desk tipsters</>
            )}
          </button>
          <button
            type="button"
            onClick={handleRunDaily}
            disabled={running || settingUp}
            className={buttonClassName()}
          >
            {running ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Publishing…
              </>
            ) : (
              <>Run daily publish</>
            )}
          </button>
          <button
            type="button"
            onClick={() => loadData()}
            disabled={loading}
            className="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 font-semibold rounded-xl"
          >
            Refresh
          </button>
        </div>

        {loading && !overview ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 rounded-full border-4 border-teal-500 border-t-transparent animate-spin" />
          </div>
        ) : overview ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Enabled', value: overview.enabled ? 'Yes' : 'No' },
                { label: 'Roster setup', value: `${overview.setupCount}/${overview.rosterSize}` },
                { label: 'Active', value: String(overview.activeCount) },
                { label: 'Today published', value: String(overview.todayPublished) },
              ].map((c) => (
                <div
                  key={c.label}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm"
                >
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{c.label}</p>
                  <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{c.value}</p>
                </div>
              ))}
            </div>

            <div className="mb-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Last cron / sync status</h2>
              {overview.syncStatus ? (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">{overview.syncStatus.status}</span>
                  {' · '}
                  {formatWhen(overview.syncStatus.lastSyncAt)}
                  {overview.syncStatus.lastSyncCount != null && (
                    <> · published count {overview.syncStatus.lastSyncCount}</>
                  )}
                  {overview.syncStatus.lastError && (
                    <span className="block mt-1 text-red-600 dark:text-red-400 text-xs">{overview.syncStatus.lastError}</span>
                  )}
                </p>
              ) : (
                <p className="text-sm text-gray-500">No Acca Desk sync status yet (run daily or wait for cron).</p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Today&apos;s Acca Desk picks</h2>
                {overview.todayTickets.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 py-4">
                    No Acca Desk coupons today. Run daily publish after fixtures/odds are synced.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-[32rem] overflow-y-auto">
                    {overview.todayTickets.map((t) => (
                      <div key={t.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">{t.title}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {t.displayName} · @{t.username} · {Number(t.totalOdds).toFixed(2)} odds ·{' '}
                              {formatWhen(t.createdAt)}
                            </p>
                          </div>
                          <span className="self-start px-2 py-0.5 text-xs font-medium rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                            Free · {t.status}
                          </span>
                        </div>
                        {t.legs?.length > 0 && (
                          <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                            {t.legs.map((leg, i) => (
                              <li key={`${t.id}-${i}`}>
                                {leg.matchDescription} — {leg.prediction} @ {Number(leg.odds).toFixed(2)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Roster ({overview.rosterSize})
                </h2>
                <div className="space-y-2 max-h-[32rem] overflow-y-auto">
                  {overview.roster.map((r) => (
                    <div
                      key={r.username}
                      className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-600 shrink-0">
                          {r.avatarUrl ? (
                            <Image src={r.avatarUrl} alt={r.displayName} fill className="object-cover" sizes="40px" unoptimized />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white">{r.displayName}</p>
                          <p className="text-gray-500 dark:text-gray-400 truncate">
                            @{r.username}
                            {r.userId != null ? ` · user #${r.userId}` : ''} · {r.riskLevel}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 self-start">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            r.setup && r.isActive
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : r.setup
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200'
                          }`}
                        >
                          {!r.setup ? 'Not setup' : r.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {r.userId != null && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => impersonateUser(r.userId!)}
                            disabled={impersonating === r.userId}
                          >
                            {impersonating === r.userId ? '…' : 'Impersonate'}
                          </Button>
                        )}
                        {r.username && (
                          <Link
                            href={`/tipsters/${encodeURIComponent(r.username)}`}
                            className={buttonClassName({ size: 'sm', variant: 'secondary' })}
                          >
                            Profile
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {lastRun && lastRun.details?.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Last run details</h2>
                <div className="space-y-2 max-h-64 overflow-y-auto text-sm">
                  {lastRun.details.map((d, i) => (
                    <div key={`${d.username}-${d.slotKey || i}`} className="flex justify-between gap-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="font-medium text-gray-900 dark:text-white">
                        @{d.username}
                        {d.slotKey ? ` · ${d.slotKey}` : ''}
                      </span>
                      <span className="text-gray-600 dark:text-gray-300">
                        {d.status}
                        {d.ticketId ? ` #${d.ticketId}` : ''}
                        {d.message ? ` · ${d.message}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link href="/admin/ai-predictions" className="text-teal-700 dark:text-teal-400 hover:underline font-medium">
            → AI Predictions (singles)
          </Link>
          <Link href="/admin/analytics?tab=acca" className="text-teal-700 dark:text-teal-400 hover:underline font-medium">
            → Acca Generator analytics
          </Link>
          <Link href="/leaderboard" className="text-teal-700 dark:text-teal-400 hover:underline font-medium">
            → Leaderboard
          </Link>
          <Link href="/admin/users" className="text-teal-700 dark:text-teal-400 hover:underline font-medium">
            → Users (search Acca*)
          </Link>
          <Link href="/marketplace" className="text-teal-700 dark:text-teal-400 hover:underline font-medium">
            → Marketplace
          </Link>
        </div>
      </main>
    </div>
  );
}
