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
  if (status === 'won') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (status === 'lost') return 'text-red-700 bg-red-50 border-red-200';
  if (status === 'pending') return 'text-[var(--primary)] bg-[var(--primary-light)] border-[var(--primary)]/25';
  if (status === 'void') return 'text-amber-800 bg-amber-50 border-amber-200';
  return 'text-[var(--text-muted)] bg-[var(--fill-secondary)] border-[var(--border)]';
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
  const currentDay = board.run?.currentDay || board.today.dayNumber;
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

  const todayMoney = board.days.find((d) => d.dayNumber === board.today.dayNumber);
  const archive = board.archive;
  const bestLine =
    archive && archive.bestWonDays > 0
      ? archive.bestExampleReturnGhs != null && archive.bestCampaignStakeGhs != null
        ? t('rollover.best_run_example', {
            day: String(archive.bestWonDays),
            stake: String(Math.round(archive.bestCampaignStakeGhs)),
            ret: String(archive.bestExampleReturnGhs),
          })
        : t('rollover.best_run', { day: String(archive.bestWonDays) })
      : t('rollover.best_run_none');

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text-muted)]">
        <p className="font-semibold text-[var(--text)]">{runNote}</p>
        <p className="mt-1">
          {t('rollover.owner', { name: board.ownerDisplayName })} · {board.oddsMin.toFixed(2)}–{board.oddsMax.toFixed(2)} @ ~{board.targetOdds.toFixed(2)}
        </p>
        <p className="mt-1">{t('rollover.campaign_stake', { stake: String(Math.round(board.exampleStakeStartGhs)) })}</p>
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
        ) : (
          <p className="text-xs text-[var(--text-muted)]">{t('rollover.example_later_hint', { odds: board.targetOdds.toFixed(2) })}</p>
        )}
      </section>

      <section>
        <h2 className="text-base font-semibold text-[var(--text)] mb-3">{t('rollover.plan_title')}</h2>
        <div className="mb-3 rounded-xl border border-[var(--border)] bg-[var(--fill-secondary)]/60 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            {t('rollover.records')}
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--text)]">{bestLine}</p>
          {archive ? (
            <>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                {archive.campaignsReset > 0
                  ? t('rollover.campaigns_with_reset', {
                      completed: String(archive.campaignsCompleted),
                      cut: String(archive.campaignsCut),
                      reset: String(archive.campaignsReset),
                    })
                  : t('rollover.campaigns', {
                      completed: String(archive.campaignsCompleted),
                      cut: String(archive.campaignsCut),
                    })}
              </p>
              {archive.lastEnded?.status === 'broken' ? (
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {t('rollover.last_cut', { day: String(archive.lastEnded.endedDay || archive.lastEnded.wonDays || 1) })}
                </p>
              ) : archive.lastEnded?.status === 'reset' ? (
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {t('rollover.last_reset', { day: String(archive.lastEnded.endedDay || archive.lastEnded.wonDays || 1) })}
                </p>
              ) : archive.lastEnded?.status === 'completed' ? (
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {t('rollover.last_finished', { total: String(board.planDays) })}
                </p>
              ) : null}
            </>
          ) : null}
        </div>
        <ul className="md:hidden divide-y divide-[var(--separator)] rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          {board.days.map((day) => {
            const inner = (
              <div className="flex items-center justify-between gap-3 px-3 py-2.5 min-h-[44px]">
                <span className="text-sm font-semibold tabular-nums text-[var(--text)]">
                  {t('rollover.day')} {day.dayNumber}
                </span>
                <span className="flex items-center gap-2 min-w-0">
                  {day.combinedOdds != null ? (
                    <span className="text-xs tabular-nums text-[var(--text-muted)]">{Number(day.combinedOdds).toFixed(2)}</span>
                  ) : null}
                  <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${statusClass(day.status)}`}>
                    {t(statusKey(day.status))}
                  </span>
                </span>
              </div>
            );
            const highlight = day.dayNumber === currentDay && day.status === 'pending';
            const wrapClass = highlight ? 'bg-[var(--primary-light)]/40' : '';
            return (
              <li key={day.dayNumber} className={wrapClass}>
                {day.ticketId ? (
                  <Link href={`/coupons/${day.ticketId}`} className="block hover:bg-[var(--fill-secondary)]">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>

        <div className="hidden md:block overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--separator)]">
                <th className="px-4 py-3 font-semibold">{t('rollover.day')}</th>
                <th className="px-4 py-3 font-semibold">{t('rollover.status')}</th>
                <th className="px-4 py-3 font-semibold">{t('rollover.odds')}</th>
                <th className="px-4 py-3 font-semibold">{t('rollover.example')}</th>
                <th className="px-4 py-3 font-semibold">{t('rollover.coupon')}</th>
              </tr>
            </thead>
            <tbody>
              {board.days.map((day) => {
                const highlight = day.dayNumber === currentDay && day.status === 'pending';
                return (
                  <tr
                    key={day.dayNumber}
                    className={`border-b border-[var(--separator)] last:border-0 ${highlight ? 'bg-[var(--primary-light)]/40' : ''}`}
                  >
                    <td className="px-4 py-2.5 font-semibold tabular-nums">{day.dayNumber}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${statusClass(day.status)}`}>
                        {t(statusKey(day.status))}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-[var(--text-muted)]">
                      {day.combinedOdds != null ? Number(day.combinedOdds).toFixed(2) : '—'}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-[var(--text-muted)]">
                      {day.exampleStakeGhs != null && day.exampleReturnGhs != null
                        ? `GHS ${day.exampleStakeGhs} → ${day.exampleReturnGhs}`
                        : t('rollover.example_later', { odds: board.targetOdds.toFixed(2) })}
                    </td>
                    <td className="px-4 py-2.5">
                      {day.ticketId ? (
                        <Link href={`/coupons/${day.ticketId}`} className="font-medium text-[var(--primary)] hover:underline">
                          {t('rollover.view_coupon')}
                        </Link>
                      ) : (
                        <span className="text-[var(--text-tertiary)]">—</span>
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
        className="rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3.5 text-sm text-amber-950"
        role="note"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-800/80">
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
