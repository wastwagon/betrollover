'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import { PickCard } from '@/components/PickCard';
import { getApiUrl } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { buttonClassName } from '@/components/ui/Button';

type VipPick = {
  id?: number;
  matchDescription?: string;
  prediction?: string;
  odds?: number;
  matchDate?: string | Date | null;
  result?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  fixtureStatus?: string | null;
  fixtureStatusElapsed?: number | null;
  homeTeamLogo?: string | null;
  awayTeamLogo?: string | null;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
  homeCountryCode?: string | null;
  awayCountryCode?: string | null;
};

type TodayTicket = {
  id: number;
  title: string;
  totalOdds: number;
  totalPicks: number;
  price?: number;
  status: string;
  result?: string;
  createdAt: string;
  bookmakerKey?: string | null;
  bookingCode?: string | null;
  picks?: VipPick[];
  legs?: VipPick[];
};

type Overview = {
  enabled: boolean;
  subscriptionsEnabled: boolean;
  cron: string;
  earlyCron: string;
  timezone: string;
  todayDeskDay: string;
  tomorrowDeskDay: string;
  maxPerDay: number;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  winRate?: number;
  roi?: number;
  totalPicks?: number;
  wonPicks?: number;
  lostPicks?: number;
  rank?: number | null;
  setup: boolean;
  isActive: boolean;
  userId: number | null;
  packageId: number | null;
  packageName: string | null;
  packagePrice: number | null;
  todayPublished: number;
  tomorrowPublished: number;
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
  tomorrowTickets: TodayTicket[];
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

function VipSlipCards({
  tickets,
  empty,
  className,
  tipster,
  telegramConfigured,
  resendingId,
  onResendTelegram,
}: {
  tickets?: TodayTicket[];
  empty: string;
  className?: string;
  tipster: {
    displayName: string;
    username: string;
    avatarUrl?: string | null;
    winRate?: number;
    roi?: number;
    totalPicks?: number;
    wonPicks?: number;
    lostPicks?: number;
    rank?: number | null;
  };
  telegramConfigured: boolean;
  resendingId: number | null;
  onResendTelegram: (ticket: TodayTicket) => void;
}) {
  if (!tickets?.length) {
    return <p className={`text-[var(--text-muted)] ${className || ''}`}>{empty}</p>;
  }
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl ${className || ''}`}>
      {tickets.map((t) => (
        <div key={t.id} className="space-y-2">
          <PickCard
            id={t.id}
            title={t.title}
            totalPicks={t.totalPicks}
            totalOdds={t.totalOdds}
            price={t.price ?? 0}
            status={t.status}
            result={t.result}
            picks={t.picks || t.legs || []}
            tipster={{
              displayName: tipster.displayName,
              username: tipster.username,
              avatarUrl: tipster.avatarUrl,
              tipsterType: 'vip_desk',
              winRate: tipster.winRate ?? 0,
              roi: tipster.roi,
              totalPicks: tipster.totalPicks ?? 0,
              wonPicks: tipster.wonPicks ?? 0,
              lostPicks: tipster.lostPicks ?? 0,
              rank: tipster.rank ?? null,
            }}
            createdAt={t.createdAt}
            bookmakerKey={t.bookmakerKey}
            bookingCode={t.bookingCode}
            bookingCodeCopyCount={0}
            viewOnly
            detailsHref={`/coupons/${t.id}`}
            picksRevealed
            requiresSubscription
            expandableLegs
            socialEnabled={false}
            isPurchased
            canPurchase={false}
            onPurchase={() => {}}
          />
          <button
            type="button"
            disabled={resendingId === t.id || !telegramConfigured}
            title={
              telegramConfigured
                ? 'Post this slip to the VIP Telegram chat again if the last message was deleted'
                : 'VIP Telegram is not configured'
            }
            className={buttonClassName({ variant: 'secondary', size: 'sm', fullWidth: true })}
            onClick={() => onResendTelegram(t)}
          >
            {resendingId === t.id ? 'Sending to Telegram…' : 'Resend to Telegram'}
          </button>
        </div>
      ))}
    </div>
  );
}

export default function AdminVipTipsterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [telegram, setTelegram] = useState<VipTelegramStatus | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [settingUp, setSettingUp] = useState(false);
  const [running, setRunning] = useState(false);
  const [telegramBusy, setTelegramBusy] = useState(false);
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [forceSettling, setForceSettling] = useState(false);

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

  const handleForceSettleWslCupStuck = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const ok = window.confirm(
      'API-Sports still has WSL Cup as NS with no scores. Apply confirmed FT results and settle?\n\n' +
        '• Crystal Palace W vs Watford W → 1–0\n' +
        '• Brighton W vs Charlton Athletic W → 4–0\n\n' +
        'This grades pending picks and can move the 7-day rollover Day 1 off LIVE.',
    );
    if (!ok) return;
    setForceSettling(true);
    setMessage(null);
    try {
      const res = await fetch(`${getApiUrl()}/admin/settlement/apply-scores`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fixtures: [
            { apiId: 1612632, homeScore: 1, awayScore: 0 },
            { apiId: 1612639, homeScore: 4, awayScore: 0 },
          ],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const picks = (data as { picksUpdated?: number }).picksUpdated ?? 0;
        const tickets = (data as { ticketsSettled?: number }).ticketsSettled ?? 0;
        setMessage({
          type: 'success',
          text: `Scores applied. ${picks} pick(s) updated, ${tickets} ticket(s) settled.`,
        });
        await loadData();
      } else {
        setMessage({ type: 'error', text: getApiErrorMessage(data, 'Force settle failed — deploy latest backend first') });
      }
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message || 'Force settle failed' });
    } finally {
      setForceSettling(false);
    }
  };

  const handleResendTelegram = async (ticket: TodayTicket) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const ok = window.confirm(
      `Post “${ticket.title}” to the VIP Telegram chat again? This creates a new message if the last one was deleted.`,
    );
    if (!ok) return;
    setResendingId(ticket.id);
    setMessage(null);
    try {
      const res = await fetch(`${getApiUrl()}/admin/vip-tipster/tickets/${ticket.id}/repost-telegram`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({
          type: 'success',
          text: `Posted coupon #${ticket.id} to VIP Telegram.`,
        });
      } else {
        setMessage({ type: 'error', text: getApiErrorMessage(data, 'Telegram resend failed') });
      }
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message || 'Telegram resend failed' });
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <AdminSidebar />
      <main className="admin-main-sibling section-ux-admin-main min-w-0">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">VIP Two-Fold</h1>
          <p className="text-gray-600 dark:text-gray-400">
            One paid tipster. Two Home wins at 1.20–1.40, combined 1.50–1.99. Up to 2 slips
            per desk day, using the same Early / Afternoon / Evening / Midnight windows as
            Acca Desk — skip a window when no pair exists. VIP publishes first so AccaSure1X2
            never reuses those fixtures (Sure can still mix Away on what is left). New VIP
            slips auto-attach to the 7-day /rollover board.
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
                <div className="text-xs text-[var(--text-muted)]">
                  Tomorrow ({overview?.tomorrowDeskDay || '—'})
                </div>
                <div className="font-semibold text-[var(--text)]">
                  {overview?.tomorrowPublished ?? 0} / {overview?.maxPerDay ?? 1}
                </div>
                <div className="text-sm text-[var(--text-muted)]">
                  Today {overview?.todayDeskDay}: {overview?.todayPublished ?? 0} posted
                </div>
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
              Early cron {overview?.earlyCron || '0 20 * * *'} ({overview?.timezone}) for tomorrow
              (before Acca Desk); catch-up {overview?.cron || '20 0 * * *'} for today. Last run:{' '}
              {overview?.syncStatus?.lastSyncAt
                ? `${overview.syncStatus.status} · ${overview.syncStatus.lastSyncCount ?? 0} published`
                : 'never'}
              {overview?.syncStatus?.lastError ? ` · ${overview.syncStatus.lastError}` : ''}
            </p>

            <h2 className="text-lg font-semibold text-[var(--text)] mb-3">
              Tomorrow’s VIP slips ({overview?.tomorrowDeskDay})
            </h2>
            <VipSlipCards
              tickets={overview?.tomorrowTickets}
              empty="No VIP slip for tomorrow yet."
              className="mb-8"
              telegramConfigured={!!telegram?.configured}
              resendingId={resendingId}
              onResendTelegram={handleResendTelegram}
              tipster={{
                displayName: overview?.displayName || 'VIP · Two-Fold',
                username: overview?.username || 'VipTwoFold',
                avatarUrl: overview?.avatarUrl,
                winRate: overview?.winRate,
                roi: overview?.roi,
                totalPicks: overview?.totalPicks,
                wonPicks: overview?.wonPicks,
                lostPicks: overview?.lostPicks,
                rank: overview?.rank,
              }}
            />

            <h2 className="text-lg font-semibold text-[var(--text)] mb-3">
              Today’s VIP slips ({overview?.todayDeskDay})
            </h2>
            {(overview?.todayTickets ?? []).some((t) =>
              (t.picks ?? t.legs ?? []).some((p) => (p.result || 'pending').toLowerCase() === 'pending'),
            ) ? (
              <div className="mb-4 rounded-xl border border-amber-300/80 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-amber-950 dark:text-amber-100">
                  Legs still pending after kickoff? If API-Sports never wrote FT scores (WSL Cup lag), force-apply
                  Palace <strong>1–0</strong> and Brighton <strong>4–0</strong>, then run settlement.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={forceSettling}
                  onClick={handleForceSettleWslCupStuck}
                >
                  {forceSettling ? 'Settling…' : 'Force settle WSL Cup legs'}
                </Button>
              </div>
            ) : null}
            <VipSlipCards
              tickets={overview?.todayTickets}
              empty="No VIP slips for this desk day yet."
              telegramConfigured={!!telegram?.configured}
              resendingId={resendingId}
              onResendTelegram={handleResendTelegram}
              tipster={{
                displayName: overview?.displayName || 'VIP · Two-Fold',
                username: overview?.username || 'VipTwoFold',
                avatarUrl: overview?.avatarUrl,
                winRate: overview?.winRate,
                roi: overview?.roi,
                totalPicks: overview?.totalPicks,
                wonPicks: overview?.wonPicks,
                lostPicks: overview?.lostPicks,
                rank: overview?.rank,
              }}
            />
          </>
        )}
      </main>
    </div>
  );
}
