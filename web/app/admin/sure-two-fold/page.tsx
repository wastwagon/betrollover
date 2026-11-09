'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import { PickCard } from '@/components/PickCard';
import { getApiUrl } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { buttonClassName } from '@/components/ui/Button';
import { VIP_DESK_TIPSTER_TYPE } from '@/lib/tipster-kind';

type DeskPick = {
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
  picks?: DeskPick[];
  legs?: DeskPick[];
};

type Overview = {
  enabled: boolean;
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
  todayPublished: number;
  tomorrowPublished: number;
  syncStatus: {
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

function FreeDeskSlipCards({
  tickets,
  empty,
  className,
  tipster,
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
}) {
  if (!tickets?.length) {
    return <p className={`text-[var(--text-muted)] ${className || ''}`}>{empty}</p>;
  }
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl ${className || ''}`}>
      {tickets.map((t) => (
        <PickCard
          key={t.id}
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
            tipsterType: VIP_DESK_TIPSTER_TYPE,
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
          requiresSubscription={false}
          expandableLegs
          socialEnabled={false}
          isPurchased
          canPurchase={false}
          onPurchase={() => {}}
        />
      ))}
    </div>
  );
}

/** Free Sure · Two-Fold desk publisher. Not AccaSure1X2 VIP / not 7-day Rollover. */
export default function AdminSureTwoFoldPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [settingUp, setSettingUp] = useState(false);
  const [running, setRunning] = useState(false);
  const loadData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    setLoading(true);
    try {
      const overviewRes = await fetch(`${getApiUrl()}/admin/sure-two-fold/overview`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await overviewRes.json().catch(() => ({}));
      if (overviewRes.ok) {
        setOverview(data as Overview);
      } else {
        setMessage({ type: 'error', text: getApiErrorMessage(data, 'Failed to load Sure · Two-Fold overview') });
      }
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message || 'Failed to load Sure · Two-Fold overview' });
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
      const res = await fetch(`${getApiUrl()}/admin/setup/sure-two-fold`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({
          type: 'success',
          text: `Sure · Two-Fold desk ready. Tipster user #${data.userId}. AccaSure1X2 VIP package stays separate${
            data.packageId ? ` (package #${data.packageId})` : ''
          }.`,
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
      const res = await fetch(`${getApiUrl()}/admin/sure-two-fold/run-daily`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ deskDay }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const r = data as RunResult;
        if (!r.enabled) {
          setMessage({
            type: 'error',
            text: 'Sure · Two-Fold desk is disabled (VIP_TIPSTER_ENABLED=false — legacy env name for this free desk).',
          });
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


  const tipsterCard = {
    displayName: overview?.displayName || 'Sure · Two-Fold',
    username: overview?.username || 'SureTwoFold',
    avatarUrl: overview?.avatarUrl,
    winRate: overview?.winRate,
    roi: overview?.roi,
    totalPicks: overview?.totalPicks,
    wonPicks: overview?.wonPicks,
    lostPicks: overview?.lostPicks,
    rank: overview?.rank,
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <AdminSidebar />
      <main className="admin-main-sibling section-ux-admin-main min-w-0">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Sure · Two-Fold (free)</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Free Home+Home desk only — not VIP, not AccaSure1X2, not the 7-day Rollover board. Two Home wins at
            1.20–1.40 (combined 1.50–1.99), up to 2 slips per desk day. Publishes before Acca Desk so those
            fixtures are claimed first. Paid VIP + Telegram:{' '}
            <Link href="/admin/acca-desk#vip-telegram" className="font-medium text-teal-700 dark:text-teal-300 hover:underline">
              Acca Desk → AccaSure1X2 VIP Telegram
            </Link>
            . Rollover:{' '}
            <Link href="/admin/acca-desk#rollover" className="font-medium text-teal-700 dark:text-teal-300 hover:underline">
              Acca Desk → 7-day Rollover
            </Link>
            .
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
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="text-xs text-[var(--text-muted)]">Desk</div>
                <div className="font-semibold text-[var(--text)]">{overview?.displayName || 'Sure · Two-Fold'}</div>
                <div className="text-sm text-[var(--text-muted)]">
                  {overview?.setup ? (overview.isActive ? 'Active · free' : 'Inactive') : 'Not set up'}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="text-xs text-[var(--text-muted)]">Tomorrow ({overview?.tomorrowDeskDay || '—'})</div>
                <div className="font-semibold text-[var(--text)]">
                  {overview?.tomorrowPublished ?? 0} / {overview?.maxPerDay ?? 2}
                </div>
                <div className="text-sm text-[var(--text-muted)]">
                  Today {overview?.todayDeskDay}: {overview?.todayPublished ?? 0} posted
                </div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="text-xs text-[var(--text-muted)]">Publisher</div>
                <div className="font-semibold text-[var(--text)]">
                  {overview?.enabled ? 'On' : 'Off (VIP_TIPSTER_ENABLED)'}
                </div>
                <div className="text-sm text-[var(--text-muted)]">Env name is legacy — this desk is free</div>
              </div>
            </div>

            <div className="mb-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSetup}
                disabled={settingUp || running}
                className={buttonClassName({ variant: 'secondary' })}
              >
                {settingUp ? 'Setting up…' : 'Seed Sure · Two-Fold desk'}
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
              <Link href="/admin/acca-desk#rollover" className={buttonClassName({ variant: 'secondary' })}>
                7-day Rollover
              </Link>
              <Link href="/admin/acca-desk#vip-telegram" className={buttonClassName({ variant: 'secondary' })}>
                AccaSure1X2 VIP Telegram
              </Link>
            </div>

            <p className="mb-4 text-sm text-[var(--text-muted)]">
              Early cron {overview?.earlyCron || '0 20 * * *'} ({overview?.timezone}) for tomorrow (before Acca
              Desk); catch-up {overview?.cron || '20 0 * * *'} for today. Last run:{' '}
              {overview?.syncStatus?.lastSyncAt
                ? `${overview.syncStatus.status} · ${overview.syncStatus.lastSyncCount ?? 0} published`
                : 'never'}
              {overview?.syncStatus?.lastError ? ` · ${overview.syncStatus.lastError}` : ''}
            </p>

            <h2 className="text-lg font-semibold text-[var(--text)] mb-3">
              Tomorrow’s Two-Fold slips ({overview?.tomorrowDeskDay})
            </h2>
            <FreeDeskSlipCards
              tickets={overview?.tomorrowTickets}
              empty="No Two-Fold slip for tomorrow yet."
              className="mb-8"
              tipster={tipsterCard}
            />

            <h2 className="text-lg font-semibold text-[var(--text)] mb-3">
              Today’s Two-Fold slips ({overview?.todayDeskDay})
            </h2>
            <FreeDeskSlipCards
              tickets={overview?.todayTickets}
              empty="No Two-Fold slips for this desk day yet."
              tipster={tipsterCard}
            />
          </>
        )}
      </main>
    </div>
  );
}
