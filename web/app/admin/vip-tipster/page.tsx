'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getApiUrl } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { buttonClassName } from '@/components/ui/Button';

type TodayTicket = {
  id: number;
  title: string;
  totalOdds: number;
  totalPicks: number;
  status: string;
  createdAt: string;
  legs: { matchDescription: string; prediction: string; odds: number }[];
};

type Overview = {
  enabled: boolean;
  subscriptionsEnabled: boolean;
  cron: string;
  earlyCron: string;
  timezone: string;
  todayDeskDay: string;
  maxPerDay: number;
  username: string;
  displayName: string;
  setup: boolean;
  isActive: boolean;
  userId: number | null;
  packageId: number | null;
  packageName: string | null;
  packagePrice: number | null;
  todayPublished: number;
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
  todayTickets: TodayTicket[];
};

type RunResult = {
  enabled: boolean;
  reason?: string;
  deskDay: string;
  published: number;
  skippedAlreadyPosted: number;
  skippedEmptyPool: number;
  skippedNoUser: number;
  errors: number;
};

type VipTelegramStatus = {
  enabled: boolean;
  configured: boolean;
  chatId: string | null;
  botUsername: string | null;
  webhookUrl: string | null;
  webhookSecretSet: boolean;
};

export default function AdminVipTipsterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [telegram, setTelegram] = useState<VipTelegramStatus | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [settingUp, setSettingUp] = useState(false);
  const [running, setRunning] = useState(false);
  const [telegramBusy, setTelegramBusy] = useState(false);

  const loadData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    setLoading(true);
    try {
      const [overviewRes, telegramRes] = await Promise.all([
        fetch(`${getApiUrl()}/admin/vip-tipster/overview`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        }),
        fetch(`${getApiUrl()}/admin/telegram/vip/status`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        }),
      ]);
      const data = await overviewRes.json().catch(() => ({}));
      if (overviewRes.ok) {
        setOverview(data as Overview);
      } else {
        setMessage({ type: 'error', text: getApiErrorMessage(data, 'Failed to load VIP overview') });
      }
      if (telegramRes.ok) {
        setTelegram((await telegramRes.json()) as VipTelegramStatus);
      }
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message || 'Failed to load VIP overview' });
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
      const res = await fetch(`${getApiUrl()}/admin/setup/vip-tipster`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({
          type: 'success',
          text: `VIP tipster ready${data.packageCreated ? ' (package created)' : ''}. User #${data.userId}, package #${data.packageId}.`,
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
      const res = await fetch(`${getApiUrl()}/admin/vip-tipster/run-daily`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ deskDay }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const r = data as RunResult;
        if (!r.enabled) {
          const why =
            r.reason === 'subscriptions_off'
              ? 'VIP publish needs SUBSCRIPTIONS_ENABLED=true (and the public flag on web).'
              : 'VIP tipster is disabled (VIP_TIPSTER_ENABLED=false).';
          setMessage({ type: 'error', text: why });
        } else {
          setMessage({
            type: r.errors > 0 ? 'error' : 'success',
            text: `Desk ${r.deskDay}: published ${r.published} · already ${r.skippedAlreadyPosted} · empty ${r.skippedEmptyPool} · errors ${r.errors}`,
          });
        }
        await loadData();
      } else {
        setMessage({ type: 'error', text: getApiErrorMessage(data, 'Publish failed') });
      }
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message || 'Publish failed' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <AdminSidebar />
      <main className="admin-main-sibling section-ux-admin-main min-w-0">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">VIP Two-Fold</h1>
          <p className="text-gray-600 dark:text-gray-400">
            One paid tipster, up to two 2-folds a day for subscribers. Home or Draw at 1.42–1.70
            (Brazil, Championship, Serie A, Liga Alef, USL Championship) or Brazil Over 1.5.
            Combined 2.20–2.80. Not Acca Desk — free bots stay on the marketplace.
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

        {loading && !overview ? (
          <p className="text-gray-600 dark:text-gray-400">Loading…</p>
        ) : (
          <>
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="text-xs text-[var(--text-muted)]">Bot</div>
                <div className="font-semibold text-[var(--text)]">
                  {overview?.displayName || 'VIP · Two-Fold'}
                </div>
                <div className="text-sm text-[var(--text-muted)]">
                  {overview?.setup ? (overview.isActive ? 'Active' : 'Inactive') : 'Not set up'}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="text-xs text-[var(--text-muted)]">Package</div>
                <div className="font-semibold text-[var(--text)]">
                  {overview?.packageName || '—'}
                </div>
                <div className="text-sm text-[var(--text-muted)]">
                  {overview?.packagePrice != null ? `GHS ${overview.packagePrice}` : 'Seed the bot first'}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="text-xs text-[var(--text-muted)]">Today ({overview?.todayDeskDay})</div>
                <div className="font-semibold text-[var(--text)]">
                  {overview?.todayPublished ?? 0} / {overview?.maxPerDay ?? 2}
                </div>
                <div className="text-sm text-[var(--text-muted)]">Subscription slips</div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="text-xs text-[var(--text-muted)]">Flags</div>
                <div className="font-semibold text-[var(--text)]">
                  {overview?.enabled ? 'Publisher on' : 'Publisher off'}
                </div>
                <div className="text-sm text-[var(--text-muted)]">
                  {overview?.subscriptionsEnabled ? 'VIP shop visible' : 'SUBSCRIPTIONS_ENABLED=false'}
                </div>
              </div>
            </div>

            {!overview?.subscriptionsEnabled && (
              <div className="mb-6 px-4 py-3 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100">
                Coupons attach to the VIP package, so publish is skipped until{' '}
                <code className="text-sm">SUBSCRIPTIONS_ENABLED=true</code> and{' '}
                <code className="text-sm">NEXT_PUBLIC_SUBSCRIPTIONS_ENABLED=true</code>. Setup still
                works.
              </div>
            )}

            <div className="mb-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSetup}
                disabled={settingUp || running}
                className={buttonClassName({ variant: 'secondary' })}
              >
                {settingUp ? 'Setting up…' : 'Seed VIP tipster + package'}
              </button>
              <button
                type="button"
                onClick={() => handleRunDaily('today')}
                disabled={running || settingUp}
                className={buttonClassName()}
              >
                {running ? 'Publishing…' : 'Publish today'}
              </button>
              <button
                type="button"
                onClick={() => handleRunDaily('tomorrow')}
                disabled={running || settingUp}
                className={buttonClassName({ variant: 'secondary' })}
              >
                Publish tomorrow
              </button>
              <Link href="/admin/acca-desk" className={buttonClassName({ variant: 'secondary' })}>
                Acca Desk
              </Link>
            </div>

            <div className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
              <h2 className="text-lg font-semibold text-[var(--text)]">VIP Telegram bot</h2>
              <p className="text-sm text-[var(--text-muted)]">
                Same bot token as the public channel. Add it as admin of BETROLLOVER VIP (invite users, ban users, post messages).
                Set <code className="font-mono text-xs">TELEGRAM_VIP_CHAT_ID</code>, <code className="font-mono text-xs">TELEGRAM_BOT_USERNAME</code>,
                and <code className="font-mono text-xs">TELEGRAM_WEBHOOK_URL=https://api.betrollover.com/telegram/webhook</code>.
              </p>
              <p className="text-sm">
                {telegram?.configured ? (
                  <span className="text-emerald-700 dark:text-emerald-300">
                    Configured · chat {telegram.chatId || '—'} · @{telegram.botUsername || 'unset'}
                    {telegram.webhookSecretSet ? ' · webhook secret set' : ''}
                  </span>
                ) : (
                  <span className="text-amber-700 dark:text-amber-300">Not configured — paying members will not get a Telegram invite yet.</span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={telegramBusy}
                  className={buttonClassName({ variant: 'secondary' })}
                  onClick={async () => {
                    const token = localStorage.getItem('token');
                    if (!token) return;
                    setTelegramBusy(true);
                    setMessage(null);
                    try {
                      const res = await fetch(`${getApiUrl()}/admin/telegram/vip/test`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                      });
                      const data = await res.json().catch(() => ({}));
                      setMessage(
                        res.ok
                          ? { type: 'success', text: 'Posted a test message to the VIP chat.' }
                          : { type: 'error', text: getApiErrorMessage(data, 'VIP Telegram test failed') },
                      );
                    } finally {
                      setTelegramBusy(false);
                    }
                  }}
                >
                  Test VIP post
                </button>
                <button
                  type="button"
                  disabled={telegramBusy}
                  className={buttonClassName({ variant: 'secondary' })}
                  onClick={async () => {
                    const token = localStorage.getItem('token');
                    if (!token) return;
                    setTelegramBusy(true);
                    setMessage(null);
                    try {
                      const res = await fetch(`${getApiUrl()}/admin/telegram/vip/setup-webhook`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      const data = await res.json().catch(() => ({}));
                      setMessage(
                        res.ok
                          ? { type: 'success', text: `Webhook set to ${data.url || 'Telegram'}.` }
                          : { type: 'error', text: getApiErrorMessage(data, 'Webhook setup failed') },
                      );
                    } finally {
                      setTelegramBusy(false);
                    }
                  }}
                >
                  Set VIP webhook
                </button>
                <button
                  type="button"
                  disabled={telegramBusy}
                  className={buttonClassName({ variant: 'secondary' })}
                  onClick={async () => {
                    const token = localStorage.getItem('token');
                    if (!token) return;
                    setTelegramBusy(true);
                    setMessage(null);
                    try {
                      const res = await fetch(`${getApiUrl()}/admin/telegram/vip/kick-expired`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      const data = await res.json().catch(() => ({}));
                      setMessage(
                        res.ok
                          ? { type: 'success', text: `Removed ${data.kicked ?? 0} expired member(s).` }
                          : { type: 'error', text: getApiErrorMessage(data, 'Kick failed') },
                      );
                    } finally {
                      setTelegramBusy(false);
                    }
                  }}
                >
                  Remove expired members
                </button>
              </div>
            </div>

            <p className="mb-4 text-sm text-[var(--text-muted)]">
              Early cron {overview?.earlyCron || '5 20 * * *'} ({overview?.timezone}) for tomorrow;
              catch-up {overview?.cron || '45 8 * * *'} for today. Last run:{' '}
              {overview?.syncStatus?.lastSyncAt
                ? `${overview.syncStatus.status} · ${overview.syncStatus.lastSyncCount ?? 0} published`
                : 'never'}
              {overview?.syncStatus?.lastError ? ` · ${overview.syncStatus.lastError}` : ''}
            </p>

            <h2 className="text-lg font-semibold text-[var(--text)] mb-3">Today’s VIP slips</h2>
            {overview?.todayTickets?.length ? (
              <ul className="space-y-3">
                {overview.todayTickets.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
                  >
                    <div className="font-medium text-[var(--text)]">{t.title}</div>
                    <div className="text-sm text-[var(--text-muted)] mb-2">
                      #{t.id} · {t.totalPicks}-fold @ {t.totalOdds} · {t.status}
                    </div>
                    <ul className="text-sm text-[var(--text)] space-y-1">
                      {t.legs.map((leg, i) => (
                        <li key={`${t.id}-${i}`}>
                          {leg.matchDescription} — {leg.prediction} @ {leg.odds}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[var(--text-muted)]">No VIP slips for this desk day yet.</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
