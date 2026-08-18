'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PickCard } from '@/components/PickCard';
import { getPickCardSocialProps, mergeSocialCountsIntoList } from '@/lib/pick-card-social';
import { currentLoginRedirectPath } from '@/lib/login-redirect-path';
import { getApiUrl } from '@/lib/site-config';
import { useT } from '@/context/LanguageContext';
import type { PickSocialCounts } from '@/components/pick-social/PickSocialBar';

type Coupon = {
  id: number;
  title: string;
  totalOdds: number;
  totalPicks: number;
  price: number;
  sport?: string;
  status?: string;
  result?: string;
  picks?: {
    id?: number;
    matchDescription?: string;
    prediction?: string;
    odds?: number;
  }[];
  tipster?: {
    id: number;
    displayName: string;
    username: string;
    isAi?: boolean;
    winRate: number;
    totalPicks: number;
    wonPicks: number;
    lostPicks: number;
    rank: number | null;
    avatarUrl?: string | null;
  } | null;
  createdAt?: string;
  bookmakerKey?: string | null;
  bookingCode?: string | null;
  bookingCodeCopyCount?: number;
  reactionCount?: number;
  hasReacted?: boolean;
  commentCount?: number;
  purchaseCount?: number;
};

type DaySlot = {
  dayNumber: number;
  calendarDate: string | null;
  ticketId: number | null;
  status: string;
  combinedOdds: number | null;
  exampleStakeGhs: number | null;
  exampleReturnGhs: number | null;
};

type Board = {
  ownerUsername: string;
  ownerDisplayName: string;
  planDays: number;
  targetOdds: number;
  oddsMin: number;
  oddsMax: number;
  exampleStakeStartGhs: number;
  calendarDate: string;
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
  } | null;
  today: {
    dayNumber: number;
    status: string;
    ticketId: number | null;
    combinedOdds: number | null;
    skipReason: 'no_qualifying' | 'awaiting_settlement' | null;
    coupon: Coupon | null;
  };
  days: DaySlot[];
};

function statusClass(status: string) {
  if (status === 'won') {
    return 'text-emerald-800 bg-emerald-50 border-emerald-200/80 dark:text-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800/70';
  }
  if (status === 'lost') {
    return 'text-red-700 bg-red-50 border-red-200/80 dark:text-red-300 dark:bg-red-950/50 dark:border-red-800/70';
  }
  if (status === 'pending') {
    return 'text-white bg-[var(--primary)] border-[var(--primary)] shadow-[var(--shadow-glow)]';
  }
  if (status === 'void') {
    return 'text-amber-800 bg-amber-50 border-amber-200/80 dark:text-amber-200 dark:bg-amber-950/50 dark:border-amber-800/70';
  }
  return '';
}

function DayMark({ dayNumber, status, live }: { dayNumber: number; status: string; live: boolean }) {
  const lost = status === 'lost';
  return (
    <span
      className={`flex h-8 w-8 items-center justify-center rounded-xl text-[13px] font-bold tabular-nums ${
        live
          ? 'bg-[var(--primary)] text-white shadow-[var(--shadow-glow)]'
          : status === 'won'
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200'
            : lost
              ? 'bg-red-50 text-red-700 dark:bg-red-950/70 dark:text-red-300'
              : 'bg-[var(--fill-secondary)] text-[var(--text-muted)]'
      }`}
    >
      {dayNumber}
    </span>
  );
}

function StatusCell({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  if (status === 'empty' || status === 'skipped') {
    return <span className="inline-block h-1.5 w-3.5 rounded-full bg-[var(--separator)]" aria-hidden />;
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] px-2 py-1 rounded-full border ${statusClass(status)}`}>
      {status === 'pending' ? (
        <span className="h-1.5 w-1.5 rounded-full bg-white/90 motion-safe:animate-pulse" aria-hidden />
      ) : null}
      {label}
    </span>
  );
}

function dayHasStarted(status: string) {
  return status === 'pending' || status === 'won' || status === 'lost' || status === 'void';
}

function MoneyCell({
  amount,
  reached,
  later,
}: {
  amount: number | null;
  reached: boolean;
  later?: string;
}) {
  if (!reached) {
    return <span className="text-[var(--text-tertiary)]">·</span>;
  }
  if (amount == null) {
    return <span className="text-[var(--text-tertiary)] tabular-nums">{later || '·'}</span>;
  }
  return (
    <span className="tabular-nums font-semibold text-[var(--primary)]">
      <span className="text-[11px] font-semibold text-emerald-700/70 dark:text-emerald-300/70">GHS</span>{' '}
      {amount}
    </span>
  );
}

export function RolloverBoard() {
  const t = useT();
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(`${getApiUrl()}/rollover`, { headers, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('bad status'))))
      .then((data) => setBoard(data as Board))
      .catch(() => setError(true));
  }, []);

  const patchCoupon = (counts: PickSocialCounts) => {
    setBoard((prev) => {
      if (!prev?.today.coupon) return prev;
      return {
        ...prev,
        today: {
          ...prev.today,
          coupon: mergeSocialCountsIntoList([prev.today.coupon], prev.today.coupon.id, counts)[0],
        },
      };
    });
  };

  if (error) {
    return (
      <p className="text-sm text-[var(--text-muted)] rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-6">
        {t('rollover.load_error')}
      </p>
    );
  }

  if (!board) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-40 rounded-2xl bg-[var(--fill-secondary)]" />
        <div className="h-64 rounded-2xl bg-[var(--fill-secondary)]" />
      </div>
    );
  }

  const coupon = board.today.coupon;
  const filledDays = board.days.filter(
    (d) => d.status === 'won' || (d.status === 'pending' && d.ticketId),
  ).length;
  const currentDay =
    board.run?.currentDay && board.run.currentDay > 0 ? board.run.currentDay : board.today.dayNumber || 1;
  const progress = Math.min(100, Math.round((filledDays / board.planDays) * 100));
  const statusKey = (status: string) => {
    if (status === 'pending') return 'rollover.status_pending';
    if (status === 'won') return 'rollover.status_won';
    if (status === 'lost') return 'rollover.status_lost';
    if (status === 'void') return 'rollover.status_void';
    if (status === 'skipped') return 'rollover.status_skipped';
    return 'rollover.status_empty';
  };

  const runNote =
    board.run?.status === 'completed'
      ? t('rollover.run_completed')
      : board.run?.status === 'broken'
        ? t('rollover.run_broken')
        : t('rollover.run_day', { day: String(currentDay), total: String(board.planDays) });

  const skipNote =
    board.today.skipReason === 'awaiting_settlement'
      ? t('rollover.waiting_settlement')
      : board.today.skipReason === 'no_qualifying'
        ? t('rollover.no_coupon', { day: String(board.today.dayNumber) })
        : null;

  const archive = board.archive;
  const todayMoney = board.days.find((d) => d.dayNumber === board.today.dayNumber && dayHasStarted(d.status));

  const laterOdds = t('rollover.example_later', { odds: board.targetOdds.toFixed(2) });
  const lastEndedNote =
    archive?.lastEnded?.status === 'broken'
      ? t('rollover.last_cut', { day: String(archive.lastEnded.endedDay || archive.lastEnded.wonDays || 1) })
      : archive?.lastEnded?.status === 'reset'
        ? t('rollover.last_reset', { day: String(archive.lastEnded.endedDay || archive.lastEnded.wonDays || 1) })
        : archive?.lastEnded?.status === 'completed'
          ? t('rollover.last_finished', { total: String(board.planDays) })
          : null;
  const statTiles = [
    {
      key: 'best',
      label: t('rollover.stat_best_run'),
      value: archive && archive.bestWonDays > 0 ? String(archive.bestWonDays) : '—',
      hint: archive && archive.bestWonDays > 0 ? t('rollover.day') : undefined,
      money: false,
      accent: false,
    },
    {
      key: 'stake',
      label: t('rollover.stat_best_stake'),
      value:
        archive?.bestCampaignStakeGhs != null
          ? String(Math.round(archive.bestCampaignStakeGhs))
          : '—',
      hint: archive?.bestCampaignStakeGhs != null ? t('rollover.stat_best_run') : undefined,
      money: true,
      accent: true,
    },
    {
      key: 'win',
      label: t('rollover.stat_best_win'),
      value: archive?.bestExampleReturnGhs != null ? String(archive.bestExampleReturnGhs) : '—',
      hint:
        archive?.bestCampaignStakeGhs != null && archive.bestExampleReturnGhs != null
          ? t('rollover.stat_from_stake', { stake: String(Math.round(archive.bestCampaignStakeGhs)) })
          : undefined,
      money: true,
      accent: true,
    },
    {
      key: 'finished',
      label: t('rollover.stat_finished'),
      value: String(archive?.campaignsCompleted ?? 0),
      money: false,
      accent: false,
    },
    {
      key: 'cut',
      label: t('rollover.stat_cut'),
      value: String(archive?.campaignsCut ?? 0),
      money: false,
      accent: false,
    },
    {
      key: 'reset',
      label: t('rollover.stat_reset'),
      value: String(archive?.campaignsReset ?? 0),
      money: false,
      accent: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5 shadow-[var(--shadow)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold tracking-tight text-[var(--text)]">{runNote}</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {t('rollover.owner', { name: board.ownerDisplayName })} · {board.oddsMin.toFixed(2)}–{board.oddsMax.toFixed(2)} @ ~{board.targetOdds.toFixed(2)}
            </p>
          </div>
          <span className="inline-flex items-center rounded-full border border-[var(--primary)]/20 bg-[var(--primary-light)] px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
            {t('rollover.campaign_stake', { stake: String(Math.round(board.exampleStakeStartGhs)) })}
          </span>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--fill-secondary)]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: 'var(--gradient-primary)',
            }}
          />
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[var(--text)]">{t('rollover.today')}</h2>
        {coupon ? (
          <PickCard
            id={coupon.id}
            title={coupon.title}
            totalPicks={coupon.totalPicks}
            totalOdds={coupon.totalOdds}
            price={coupon.price ?? 0}
            sport={coupon.sport}
            status={coupon.status}
            result={coupon.result}
            picks={coupon.picks || []}
            tipster={coupon.tipster}
            createdAt={coupon.createdAt}
            bookmakerKey={coupon.bookmakerKey}
            bookingCode={coupon.bookingCode}
            bookingCodeCopyCount={coupon.bookingCodeCopyCount ?? 0}
            purchaseCount={coupon.purchaseCount}
            viewOnly
            detailsHref={`/coupons/${coupon.id}`}
            onPurchase={() => {}}
            {...getPickCardSocialProps(coupon, {
              onCountsChange: (_id, counts) => patchCoupon(counts),
              loginRedirectPath: currentLoginRedirectPath('/rollover'),
            })}
          />
        ) : (
          <p className="text-sm text-[var(--text-muted)] rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] px-4 py-6">
            {skipNote ?? t('rollover.no_coupon', { day: String(board.today.dayNumber) })}
          </p>
        )}
        {coupon && skipNote ? <p className="text-xs text-[var(--text-muted)]">{skipNote}</p> : null}
        {todayMoney?.exampleStakeGhs != null && todayMoney.exampleReturnGhs != null ? (
          <p className="text-xs text-[var(--text-muted)]">
            {t('rollover.example_hint', {
              stake: String(todayMoney.exampleStakeGhs),
              ret: String(todayMoney.exampleReturnGhs),
              day: String(board.today.dayNumber),
              odds: board.targetOdds.toFixed(2),
            })}
          </p>
        ) : todayMoney ? (
          <p className="text-xs text-[var(--text-muted)]">{t('rollover.example_later_hint', { odds: board.targetOdds.toFixed(2) })}</p>
        ) : null}
      </section>

      <section>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
          {t('rollover.records')}
        </p>
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {statTiles.map((tile) => (
            <div
              key={tile.key}
              className={`relative overflow-hidden rounded-2xl border p-4 shadow-[var(--shadow)] ${
                tile.accent
                  ? 'border-[var(--primary)]/20 bg-gradient-to-br from-[var(--primary-light)]/80 to-[var(--card)]'
                  : 'border-[var(--border)] bg-[var(--card)]'
              }`}
            >
              <span
                className="absolute inset-x-0 top-0 h-[3px]"
                style={{ background: 'var(--gradient-primary)' }}
                aria-hidden
              />
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                {tile.label}
              </p>
              <p
                className={`mt-2 text-[1.65rem] leading-none font-bold tabular-nums tracking-tight ${
                  tile.accent && tile.value !== '—' ? 'text-[var(--primary)]' : 'text-[var(--text)]'
                }`}
              >
                {tile.money && tile.value !== '—' ? (
                  <>
                    <span className="text-sm font-semibold text-emerald-700/70 dark:text-emerald-300/70 mr-1">GHS</span>
                    {tile.value}
                  </>
                ) : (
                  tile.value
                )}
              </p>
              <p className="mt-1.5 min-h-[1.125rem] text-[11px] text-[var(--text-muted)] truncate">
                {tile.hint ?? ''}
              </p>
            </div>
          ))}
        </div>
        {lastEndedNote ? (
          <p className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--fill-secondary)]/40 px-4 py-2.5 text-xs text-[var(--text-muted)]">
            {lastEndedNote}
          </p>
        ) : null}

        <ul className="md:hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow)] overflow-hidden">
          {board.days.map((day, i) => {
            const inPlay = day.status === 'pending' && day.ticketId != null;
            const weekBreak = day.dayNumber === 8 || day.dayNumber === 15 || day.dayNumber === 22;
            const reached = dayHasStarted(day.status);
            const inner = (
              <div className={`flex items-center gap-3 px-3.5 py-2.5 min-h-[52px] ${inPlay ? 'bg-[var(--primary-light)]/50' : ''}`}>
                <DayMark dayNumber={day.dayNumber} status={day.status} live={inPlay} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <StatusCell status={day.status} label={t(statusKey(day.status))} />
                    {day.combinedOdds != null ? (
                      <span className="text-xs font-medium tabular-nums text-[var(--text)]">{Number(day.combinedOdds).toFixed(2)}</span>
                    ) : null}
                  </div>
                  {reached ? (
                    <div className="mt-1 flex items-center gap-4 text-[11px]">
                      <span className="min-w-0 truncate">
                        <span className="mr-1 uppercase tracking-wide text-[var(--text-tertiary)]">{t('rollover.stake')}</span>
                        <MoneyCell amount={day.exampleStakeGhs} reached={reached} />
                      </span>
                      <span className="min-w-0 truncate">
                        <span className="mr-1 uppercase tracking-wide text-[var(--text-tertiary)]">{t('rollover.win')}</span>
                        <MoneyCell amount={day.exampleReturnGhs} reached={reached} later={laterOdds} />
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
            return (
              <li
                key={day.dayNumber}
                className={weekBreak ? 'border-t-2 border-[var(--border)]' : i > 0 ? 'border-t border-[var(--separator)]' : ''}
              >
                {day.ticketId ? (
                  <Link href={`/coupons/${day.ticketId}`} className="block active:bg-[var(--fill-secondary)]">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>

        <div className="hidden md:block overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow)]">
          <table className="w-full text-sm border-separate border-spacing-0">
            <caption className="sr-only">{t('rollover.plan_title')}</caption>
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-white">
                <th className="px-5 py-3.5 font-bold" style={{ background: 'var(--gradient-primary)' }}>{t('rollover.day')}</th>
                <th className="px-4 py-3.5 font-bold" style={{ background: 'var(--gradient-primary)' }}>{t('rollover.status')}</th>
                <th className="px-4 py-3.5 font-bold" style={{ background: 'var(--gradient-primary)' }}>{t('rollover.odds')}</th>
                <th className="px-4 py-3.5 font-bold" style={{ background: 'var(--gradient-primary)' }}>{t('rollover.stake')}</th>
                <th className="px-4 py-3.5 font-bold" style={{ background: 'var(--gradient-primary)' }}>{t('rollover.win')}</th>
                <th className="px-5 py-3.5 font-bold" style={{ background: 'var(--gradient-primary)' }}>{t('rollover.coupon')}</th>
              </tr>
            </thead>
            <tbody>
              {board.days.map((day) => {
                const inPlay = day.status === 'pending' && day.ticketId != null;
                const featured = inPlay && day.dayNumber === currentDay;
                const won = day.status === 'won';
                const reached = dayHasStarted(day.status);
                const weekBreak = day.dayNumber === 8 || day.dayNumber === 15 || day.dayNumber === 22;
                const rowBg = inPlay
                  ? 'bg-[var(--primary-light)]/45'
                  : won
                    ? 'bg-emerald-50/30 hover:bg-emerald-50/55 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/35'
                    : 'hover:bg-[var(--fill-secondary)]/40';
                const hairline = `${day.dayNumber === board.planDays ? 'border-b-0' : weekBreak ? 'border-[var(--border)]' : 'border-[var(--separator)]'}`;
                return (
                  <tr key={day.dayNumber} className={rowBg}>
                    <td className={`relative px-5 py-3 font-semibold tabular-nums border-b ${hairline}`}>
                      {featured ? (
                        <span className="absolute inset-y-0 left-0 w-[3px] bg-[var(--primary)]" aria-hidden />
                      ) : null}
                      <DayMark dayNumber={day.dayNumber} status={day.status} live={inPlay} />
                    </td>
                    <td className={`px-4 py-3 border-b ${hairline}`}>
                      <StatusCell status={day.status} label={t(statusKey(day.status))} />
                    </td>
                    <td
                      className={`px-4 py-3 tabular-nums border-b ${hairline} ${
                        day.combinedOdds != null ? 'font-bold text-[var(--text)]' : 'text-[var(--text-tertiary)]'
                      }`}
                    >
                      {day.combinedOdds != null ? Number(day.combinedOdds).toFixed(2) : '·'}
                    </td>
                    <td className={`px-4 py-3 border-b ${hairline}`}>
                      <MoneyCell amount={day.exampleStakeGhs} reached={reached} />
                    </td>
                    <td className={`px-4 py-3 border-b ${hairline}`}>
                      <MoneyCell amount={day.exampleReturnGhs} reached={reached} later={laterOdds} />
                    </td>
                    <td className={`px-5 py-3 border-b ${hairline}`}>
                      {day.ticketId ? (
                        <Link
                          href={`/coupons/${day.ticketId}`}
                          className="inline-flex items-center rounded-full border border-[var(--primary)]/20 bg-[var(--primary-light)] px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:text-emerald-200 dark:hover:bg-emerald-950/80 transition-colors"
                        >
                          {t('rollover.view_coupon')}
                        </Link>
                      ) : (
                        <span className="text-[var(--text-tertiary)]">·</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <aside
        className="rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3.5 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100"
        role="note"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-800/80 dark:text-amber-200/80">
          {t('rollover.disclaimer_label')}
        </p>
        <p className="mt-1.5 leading-relaxed">{t('rollover.disclaimer')}</p>
        <p className="mt-2">
          <Link href="/responsible-gambling" className="font-medium underline underline-offset-2">
            {t('resp.headline')}
          </Link>
        </p>
      </aside>
    </div>
  );
}
