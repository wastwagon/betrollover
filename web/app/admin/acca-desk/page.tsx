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
import { Input } from '@/components/ui/Input';

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
  earlyEnabled?: boolean;
  cron: string;
  earlyCron?: string;
  timezone: string;
  todayDeskDay?: string;
  tomorrowDeskDay?: string;
  legs: number;
  maxPerDay?: number;
  timeSlots?: string[];
  rosterSize: number;
  setupCount: number;
  activeCount: number;
  todayPublished: number;
  tomorrowPublished?: number;
  syncStatus: {
    status: string;
    lastSyncAt?: string | null;
    lastSyncCount?: number | null;
    lastError?: string | null;
  } | null;
  earlySyncStatus?: {
    status: string;
    lastSyncAt?: string | null;
    lastSyncCount?: number | null;
    lastError?: string | null;
  } | null;
  roster: RosterRow[];
  todayTickets: TodayTicket[];
  tomorrowTickets?: TodayTicket[];
  rollover?: {
    calendarDate: string;
    ownerUsername: string;
    planDays?: number;
    targetOdds?: number;
    campaignStakeGhs?: number;
    defaultCampaignStakeGhs?: number;
    canAttachNextDay?: boolean;
    nextDayNumber?: number;
    archive?: {
      bestWonDays: number;
      bestCampaignStakeGhs: number | null;
      bestExampleReturnGhs: number | null;
      campaignsCompleted: number;
      campaignsCut: number;
      campaignsReset: number;
      lastEnded?: {
        status: string;
        wonDays: number;
        endedDay?: number;
        endedAt: string | null;
      } | null;
    };
    run: {
      id: number;
      status: string;
      currentDay: number;
      campaignStakeGhs?: number;
      startedAt: string;
      completedAt?: string | null;
      brokenAt?: string | null;
    } | null;
    pendingDay: {
      dayNumber: number;
      calendarDate: string;
      ticketId: number | null;
      status: string;
      combinedOdds: number | null;
    } | null;
    lastDay?: {
      dayNumber: number;
      calendarDate: string;
      ticketId: number | null;
      status: string;
      combinedOdds: number | null;
    } | null;
    postedSlots?: Record<'early' | 'afternoon' | 'evening' | 'midnight', boolean>;
    candidates?: {
      id: number;
      title: string;
      slotKey: 'early' | 'afternoon' | 'evening' | 'midnight' | null;
      deskDay?: string | null;
      totalOdds: number;
      totalPicks: number;
      result: string;
      eligible: boolean;
      attached: boolean;
      canAttach: boolean;
    }[];
    canAttachEarliest?: boolean;
    blockReason?: string | null;
  };
};

type RunResult = {
  enabled: boolean;
  deskDay?: string;
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
  const [rolloverBusy, setRolloverBusy] = useState<string | null>(null);
  const [stakeDraft, setStakeDraft] = useState('20');

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

  useEffect(() => {
    const stake = overview?.rollover?.campaignStakeGhs ?? overview?.rollover?.defaultCampaignStakeGhs;
    if (stake != null) setStakeDraft(String(stake));
  }, [overview?.rollover?.campaignStakeGhs, overview?.rollover?.defaultCampaignStakeGhs]);

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

  const handleRunDaily = async (deskDay: 'today' | 'tomorrow' = 'today') => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setRunning(true);
    setMessage(null);
    try {
      const res = await fetch(`${getApiUrl()}/admin/acca-desk/run-daily`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ deskDay }),
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
            text: `Desk ${r.deskDay || deskDay}: published ${r.published} · already ${r.skippedAlreadyPosted} · empty ${r.skippedEmptyPool} · errors ${r.errors}`,
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

  const rolloverAction = async (path: string, body?: Record<string, unknown>, busy = path) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setRolloverBusy(busy);
    setMessage(null);
    try {
      const res = await fetch(`${getApiUrl()}/admin/${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : '{}',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: getApiErrorMessage(data, 'Rollover action failed') });
        return;
      }
      if (path === 'rollover/publish') {
        const r = data as RunResult;
        setLastRun(r);
        setMessage({
          type: r.errors > 0 ? 'error' : 'success',
          text: `AccaSure1X2: published ${r.published} · already ${r.skippedAlreadyPosted} · empty pool ${r.skippedEmptyPool} · errors ${r.errors}`,
        });
      } else if (path === 'rollover/attach') {
        const day = (data as { dayNumber?: number }).dayNumber;
        const ticketId = (data as { ticketId?: number }).ticketId;
        const replaced = (data as { replaced?: boolean }).replaced;
        setMessage({
          type: 'success',
          text: replaced
            ? `Switched today’s plan day ${day} to coupon #${ticketId}. Same cut rules as cron.`
            : `Attached coupon #${ticketId} as day ${day}.`,
        });
      } else if (path === 'rollover/settings') {
        setMessage({
          type: 'success',
          text: `Campaign example stake saved: GHS ${stakeDraft}. New cycles use this amount. Table examples updated.`,
        });
      } else if (path === 'rollover/reset') {
        setMessage({
          type: 'success',
          text: 'Rollover table reset. A new campaign starts at Day 1. Previous runs stay in records.',
        });
      } else if (path === 'rollover/clear-stats') {
        setMessage({
          type: 'success',
          text: 'Public records cleared. The live table is unchanged. New campaigns will rebuild stats.',
        });
      } else {
        setMessage({ type: 'success', text: 'Rollover settlement synced from existing tickets.' });
      }
      await loadData();
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message || 'Rollover action failed' });
    } finally {
      setRolloverBusy(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <AdminSidebar />
      <main className="admin-main-sibling section-ux-admin-main min-w-0">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Acca Desk</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Automated. Each Acca Desk tipster posts up to 4 free 2-folds per desk day
            (early / afternoon / evening / midnight). Primary publish at{' '}
            {overview?.earlyCron || '0 20 * * *'} ({overview?.timezone || 'Africa/Accra'}) for{' '}
            <strong>tomorrow</strong>; catch-up at {overview?.cron || '30 0 * * *'}, 06:00 and 08:45 for{' '}
            <strong>today</strong>. Cards badge Today / Tomorrow from the earliest Accra kickoff. Followers get one batched email
            after each publish that created new slips.
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
              <>Re-sync roster (fallback)</>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleRunDaily('today')}
            disabled={running || settingUp}
            className={buttonClassName()}
          >
            {running ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Publishing…
              </>
            ) : (
              <>Publish today (catch-up)</>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleRunDaily('tomorrow')}
            disabled={running || settingUp}
            className={buttonClassName({ variant: 'secondary' })}
          >
            {running ? 'Publishing…' : 'Publish tomorrow (early)'}
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
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
              {[
                { label: 'Enabled', value: overview.enabled ? 'Yes' : 'No' },
                {
                  label: 'Early (20:00)',
                  value: overview.earlyEnabled === false ? 'Off' : 'On',
                },
                { label: 'Roster setup', value: `${overview.setupCount}/${overview.rosterSize}` },
                { label: 'Active', value: String(overview.activeCount) },
                { label: 'Today published', value: String(overview.todayPublished) },
                { label: 'Tomorrow published', value: String(overview.tomorrowPublished ?? 0) },
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

            <div className="mb-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm space-y-3">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Last cron / sync status</h2>
              {overview.syncStatus ? (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Catch-up (today)</span>
                  {' · '}
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
                <p className="text-sm text-gray-500">No today catch-up sync status yet.</p>
              )}
              {overview.earlySyncStatus ? (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Early (tomorrow)</span>
                  {' · '}
                  <span className="font-medium">{overview.earlySyncStatus.status}</span>
                  {' · '}
                  {formatWhen(overview.earlySyncStatus.lastSyncAt)}
                  {overview.earlySyncStatus.lastSyncCount != null && (
                    <> · published count {overview.earlySyncStatus.lastSyncCount}</>
                  )}
                  {overview.earlySyncStatus.lastError && (
                    <span className="block mt-1 text-red-600 dark:text-red-400 text-xs">
                      {overview.earlySyncStatus.lastError}
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-sm text-gray-500">No early/tomorrow sync status yet (20:00 Accra or Publish tomorrow).</p>
              )}
            </div>

            {overview.rollover ? (
              <div className="mb-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">10-day rollover (AccaSure1X2)</h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      {overview.rollover.run
                        ? `${overview.rollover.run.status} · day ${overview.rollover.run.currentDay}/${overview.rollover.planDays ?? 10} · started ${formatWhen(overview.rollover.run.startedAt)}`
                        : 'No run yet. Reset if needed, then manually attach an AccaSure1X2 coupon as Day 1.'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Manual attach only — no auto-posting and no odds gate. List includes today’s Acca Desk board
                      and tomorrow’s early publish (20:00). Pick any pending AccaSure1X2 2-fold below to put it live
                      on{' '}
                      <span className="font-medium text-gray-700 dark:text-gray-200">/rollover</span>. If Day 1 is
                      live or already won and another slot is still to play, use{' '}
                      <span className="font-medium text-gray-700 dark:text-gray-200">Attach as Day 2</span>
                      {' — '}do not Switch, that would replace Day 1. A loss auto-resets the public table. Use Clear
                      stats to wipe the public records strip without touching the live board. Example-money
                      multiplier on the board is ×{Number(overview.rollover.targetOdds ?? 1.6).toFixed(2)} only.
                    </p>
                  </div>
                  <Link href="/rollover" className="text-sm font-medium text-teal-700 dark:text-teal-300 hover:underline">
                    Open public board
                  </Link>
                </div>

                {overview.rollover.archive ? (
                  <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
                    Records: best run Day {overview.rollover.archive.bestWonDays || '—'}
                    {overview.rollover.archive.bestExampleReturnGhs != null
                      ? ` · example GHS ${Math.round(Number(overview.rollover.archive.bestCampaignStakeGhs ?? 0))} → ${overview.rollover.archive.bestExampleReturnGhs}`
                      : ''}
                    {' · '}
                    {overview.rollover.archive.campaignsCompleted} finished · {overview.rollover.archive.campaignsCut} cut
                    {overview.rollover.archive.campaignsReset
                      ? ` · ${overview.rollover.archive.campaignsReset} reset`
                      : ''}
                  </p>
                ) : null}

                <div className="mb-4 flex flex-col sm:flex-row sm:items-end gap-3">
                  <div className="w-full sm:w-40">
                    <Input
                      id="admin-acca-campaign-stake"
                      label="Campaign example stake (GHS)"
                      type="number"
                      min={1}
                      max={100000}
                      step="1"
                      value={stakeDraft}
                      onChange={(e) => setStakeDraft(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={!!rolloverBusy}
                    onClick={() =>
                      rolloverAction('rollover/settings', { campaignStakeGhs: Number(stakeDraft) }, 'stake')
                    }
                  >
                    {rolloverBusy === 'stake' ? 'Saving…' : 'Save campaign amount'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={!!rolloverBusy}
                    onClick={() => {
                      if (
                        !window.confirm(
                          'Reset the public 10-day table? This ends the current campaign at Day 1 of a new cycle. Records are kept.',
                        )
                      ) {
                        return;
                      }
                      rolloverAction('rollover/reset', {}, 'reset');
                    }}
                  >
                    {rolloverBusy === 'reset' ? 'Resetting…' : 'Reset table'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={!!rolloverBusy}
                    onClick={() => {
                      if (
                        !window.confirm(
                          'Clear public records (best run, finished, cut, reset)? The live 10-day table is not reset.',
                        )
                      ) {
                        return;
                      }
                      rolloverAction('rollover/clear-stats', {}, 'clear-stats');
                    }}
                  >
                    {rolloverBusy === 'clear-stats' ? 'Clearing…' : 'Clear stats'}
                  </Button>
                </div>

                {overview.rollover.pendingDay ? (
                  <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                    Pending day {overview.rollover.pendingDay.dayNumber}
                    {overview.rollover.pendingDay.ticketId ? (
                      <>
                        {' · '}
                        <Link
                          href={`/coupons/${overview.rollover.pendingDay.ticketId}`}
                          className="text-teal-700 dark:text-teal-300 hover:underline"
                        >
                          coupon #{overview.rollover.pendingDay.ticketId}
                        </Link>
                      </>
                    ) : (
                      ' · waiting for you to attach a coupon'
                    )}
                    {overview.rollover.pendingDay.combinedOdds != null
                      ? ` · ${overview.rollover.pendingDay.combinedOdds.toFixed(2)}`
                      : ''}
                    {overview.rollover.blockReason === 'awaiting_settlement'
                      ? ' · wait for this coupon to settle before attaching today'
                      : ''}
                    {overview.rollover.lastDay &&
                    overview.rollover.lastDay.dayNumber !== overview.rollover.pendingDay.dayNumber
                      ? ` · Day ${overview.rollover.lastDay.dayNumber} also live${
                          overview.rollover.lastDay.ticketId ? ` (coupon #${overview.rollover.lastDay.ticketId})` : ''
                        }`
                      : ''}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2 mb-4">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={!!rolloverBusy}
                    onClick={() => rolloverAction('rollover/sync', undefined, 'sync')}
                  >
                    {rolloverBusy === 'sync' ? 'Syncing…' : 'Sync settlement'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={!!rolloverBusy}
                    onClick={() => rolloverAction('rollover/publish', {}, 'publish')}
                  >
                    {rolloverBusy === 'publish' ? 'Publishing…' : 'Publish remaining AccaSure1X2 slots'}
                  </Button>
                  {(['early', 'afternoon', 'evening', 'midnight'] as const).map((slot) => {
                    const posted = overview.rollover?.postedSlots?.[slot];
                    return (
                      <Button
                        key={slot}
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={!!rolloverBusy || posted}
                        onClick={() => rolloverAction('rollover/publish', { slotKey: slot }, `publish-${slot}`)}
                      >
                        {rolloverBusy === `publish-${slot}`
                          ? 'Publishing…'
                          : posted
                            ? `${slot} posted`
                            : `Generate ${slot}`}
                      </Button>
                    );
                  })}
                  <Button
                    type="button"
                    size="sm"
                    disabled={!!rolloverBusy || !overview.rollover.canAttachEarliest}
                    onClick={() => rolloverAction('rollover/attach', {}, 'attach-best')}
                  >
                    {rolloverBusy === 'attach-best' ? 'Attaching…' : 'Attach earliest slot'}
                  </Button>
                  {overview.rollover.canAttachNextDay ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={!!rolloverBusy}
                      onClick={() => rolloverAction('rollover/attach', { asNextDay: true }, 'attach-next')}
                    >
                      {rolloverBusy === 'attach-next'
                        ? 'Attaching…'
                        : `Attach next slot as Day ${overview.rollover.nextDayNumber ?? 2}`}
                    </Button>
                  ) : null}
                </div>

                {(overview.rollover.candidates?.length ?? 0) === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No AccaSure1X2 coupons for today’s or tomorrow’s desk day. Wait for Acca Desk to publish (or the
                    20:00 early run), or generate a slot above, then attach the one you want.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {overview.rollover.candidates!.map((c) => (
                      <div
                        key={c.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{c.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {c.deskDay
                              ? c.deskDay === overview.rollover?.calendarDate
                                ? 'today'
                                : 'tomorrow'
                              : 'desk?'}
                            {c.deskDay ? ` ${c.deskDay}` : ''} · {c.slotKey ?? 'slot?'} · {c.totalOdds.toFixed(2)} ·{' '}
                            {c.totalPicks}-fold · {c.result}
                            {c.attached ? ' · on board' : ''}
                            {c.eligible ? ' · eligible' : ' · not eligible'}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/coupons/${c.id}`}
                            className={buttonClassName({ size: 'sm', variant: 'secondary' })}
                          >
                            View
                          </Link>
                          {c.canAttach && overview.rollover?.canAttachNextDay ? (
                            <Button
                              type="button"
                              size="sm"
                              disabled={!!rolloverBusy}
                              onClick={() =>
                                rolloverAction(
                                  'rollover/attach',
                                  { ticketId: c.id, asNextDay: true },
                                  `attach-next-${c.id}`,
                                )
                              }
                            >
                              {rolloverBusy === `attach-next-${c.id}`
                                ? 'Attaching…'
                                : `Attach as Day ${overview.rollover?.nextDayNumber ?? 2}`}
                            </Button>
                          ) : null}
                          {c.canAttach &&
                          overview.rollover?.pendingDay?.ticketId &&
                          overview.rollover.blockReason !== 'awaiting_settlement' &&
                          (overview.rollover.lastDay?.dayNumber ?? overview.rollover.pendingDay.dayNumber) ===
                            overview.rollover.pendingDay.dayNumber ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={!!rolloverBusy}
                              onClick={() => rolloverAction('rollover/attach', { ticketId: c.id }, `attach-${c.id}`)}
                            >
                              {rolloverBusy === `attach-${c.id}`
                                ? 'Attaching…'
                                : `Switch day ${overview.rollover.pendingDay.dayNumber} to this`}
                            </Button>
                          ) : null}
                          {c.canAttach &&
                          !overview.rollover?.pendingDay?.ticketId &&
                          !overview.rollover?.canAttachNextDay &&
                          overview.rollover?.blockReason !== 'awaiting_settlement' ? (
                            <Button
                              type="button"
                              size="sm"
                              disabled={!!rolloverBusy}
                              onClick={() => rolloverAction('rollover/attach', { ticketId: c.id }, `attach-${c.id}`)}
                            >
                              {rolloverBusy === `attach-${c.id}` ? 'Attaching…' : 'Attach as today'}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Today&apos;s Acca Desk picks
                  {overview.todayDeskDay ? (
                    <span className="ml-2 text-sm font-normal text-gray-500">({overview.todayDeskDay})</span>
                  ) : null}
                </h2>
                {overview.todayTickets.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 py-4">
                    No Acca Desk coupons for today&apos;s desk day. Run catch-up after fixtures/odds are synced.
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
                            Today · {t.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Tomorrow&apos;s Acca Desk picks
                  {overview.tomorrowDeskDay ? (
                    <span className="ml-2 text-sm font-normal text-gray-500">({overview.tomorrowDeskDay})</span>
                  ) : null}
                </h2>
                {(overview.tomorrowTickets?.length ?? 0) === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 py-4">
                    No tomorrow board yet. Early cron posts at 20:00 Accra, or use &quot;Publish tomorrow&quot;.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-[32rem] overflow-y-auto">
                    {(overview.tomorrowTickets || []).map((t) => (
                      <div key={t.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">{t.title}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {t.displayName} · @{t.username} · {Number(t.totalOdds).toFixed(2)} odds ·{' '}
                              {formatWhen(t.createdAt)}
                            </p>
                          </div>
                          <span className="self-start px-2 py-0.5 text-xs font-medium rounded bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">
                            Tomorrow · {t.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 lg:col-span-2">
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
