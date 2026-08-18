'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PickCard } from '@/components/PickCard';
import { getPickCardSocialProps, mergeSocialCountsIntoList } from '@/lib/pick-card-social';
import { currentLoginRedirectPath } from '@/lib/login-redirect-path';
import { getApiUrl } from '@/lib/site-config';
import { useT } from '@/context/LanguageContext';
import type { PickSocialCounts } from '@/components/pick-social/PickSocialBar';
import { Badge } from '@/components/ui/Badge';
import { Surface } from '@/components/ui/Surface';
import { buttonClassName } from '@/components/ui/Button';

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

function statusTone(status: string): 'primary' | 'success' | 'danger' | 'accent' | 'neutral' {
  if (status === 'won') return 'success';
  if (status === 'lost') return 'danger';
  if (status === 'pending') return 'primary';
  if (status === 'void') return 'accent';
  return 'neutral';
}

function DayMark({ dayNumber, status, live }: { dayNumber: number; status: string; live: boolean }) {
  const lost = status === 'lost';
  return (
    <span
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-semibold tabular-nums ${
        live
          ? 'bg-[var(--primary)] text-white'
          : status === 'won'
            ? 'bg-[var(--primary-light)] text-[var(--primary-hover)]'
            : lost
              ? 'bg-[var(--fill-secondary)] text-[var(--destructive)]'
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
    <Badge tone={statusTone(status)} className="gap-1.5">
      {status === 'pending' ? (
        <span className="h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-pulse" aria-hidden />
      ) : null}
      {label}
    </Badge>
  );
}

function dayHasStarted(status: string) {
  return status === 'pending' || status === 'won' || status === 'lost' || status === 'void';
}

function GhsFigure({
  amount,
  tone,
  size = 'md',
}: {
  amount: string;
  tone: 'in' | 'out';
  size?: 'md' | 'lg';
}) {
  const figure =
    size === 'lg'
      ? 'text-[1.65rem] font-bold tracking-tight tabular-nums leading-none'
      : 'tabular-nums font-semibold';
  const ink = tone === 'out' ? 'text-[var(--primary)]' : 'text-[var(--text)]';
  const unit = tone === 'out' ? 'text-[var(--primary)]/70' : 'text-[var(--text-tertiary)]';
  return (
    <span className={`${figure} ${ink}`}>
      <span className={`mr-1 text-[11px] font-semibold ${unit}`}>GHS</span>
      {amount}
    </span>
  );
}

function MoneyCell({
  amount,
  reached,
  later,
  tone = 'out',
}: {
  amount: number | null;
  reached: boolean;
  later?: string;
  tone?: 'in' | 'out';
}) {
  if (!reached) {
    return <span className="text-[var(--text-tertiary)]">·</span>;
  }
  if (amount == null) {
    return <span className="text-[var(--text-tertiary)] tabular-nums">{later || '·'}</span>;
  }
  return <GhsFigure amount={String(amount)} tone={tone} />;
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
      <p className="text-sm text-[var(--text-muted)] rounded-[var(--radius)] border border-[var(--separator)] bg-[var(--card)] px-4 py-6">
        {t('rollover.load_error')}
      </p>
    );
  }

  if (!board) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-24 rounded-[var(--radius)] bg-[var(--fill-secondary)]" />
        <div className="h-40 rounded-[var(--radius)] bg-[var(--fill-secondary)]" />
        <div className="h-16 rounded-[var(--radius)] bg-[var(--fill-secondary)]" />
        <div className="h-72 rounded-[var(--radius)] bg-[var(--fill-secondary)]" />
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

  const bestRun = archive && archive.bestWonDays > 0 ? String(archive.bestWonDays) : '—';
  const stakeAmount =
    archive?.bestCampaignStakeGhs != null ? String(Math.round(archive.bestCampaignStakeGhs)) : null;
  const winAmount = archive?.bestExampleReturnGhs != null ? String(archive.bestExampleReturnGhs) : null;
  const outcomeCounts = [
    { key: 'finished', label: t('rollover.stat_finished'), value: String(archive?.campaignsCompleted ?? 0) },
    { key: 'cut', label: t('rollover.stat_cut'), value: String(archive?.campaignsCut ?? 0) },
    { key: 'reset', label: t('rollover.stat_reset'), value: String(archive?.campaignsReset ?? 0) },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
              {t('rollover.owner', { name: board.ownerDisplayName })}
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-[var(--text)]">
              {runNote}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {board.oddsMin.toFixed(2)}–{board.oddsMax.toFixed(2)} @ ~{board.targetOdds.toFixed(2)}
            </p>
          </div>
          <p className="text-sm tabular-nums text-[var(--text-muted)] sm:text-right">
            {t('rollover.campaign_stake', { stake: String(Math.round(board.exampleStakeStartGhs)) })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-0.5 flex-1 overflow-hidden bg-[var(--separator)]">
            <div
              className="h-full bg-[var(--primary)] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[11px] tabular-nums text-[var(--text-tertiary)]">{progress}%</span>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[var(--text)]">{t('rollover.today')}</h2>
        <div className="w-full max-w-md">
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
            <p className="text-sm text-[var(--text-muted)] rounded-[var(--radius)] border border-dashed border-[var(--separator)] px-4 py-8">
              {skipNote ?? t('rollover.no_coupon', { day: String(board.today.dayNumber) })}
            </p>
          )}
          {coupon && skipNote ? <p className="mt-3 text-xs text-[var(--text-muted)]">{skipNote}</p> : null}
          {todayMoney?.exampleStakeGhs != null && todayMoney.exampleReturnGhs != null ? (
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              {t('rollover.example_hint', {
                stake: String(todayMoney.exampleStakeGhs),
                ret: String(todayMoney.exampleReturnGhs),
                day: String(board.today.dayNumber),
                odds: board.targetOdds.toFixed(2),
              })}
            </p>
          ) : todayMoney ? (
            <p className="mt-3 text-xs text-[var(--text-muted)]">{t('rollover.example_later_hint', { odds: board.targetOdds.toFixed(2) })}</p>
          ) : null}
        </div>
      </section>

      <section className="space-y-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
          {t('rollover.records')}
        </p>

        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              {t('rollover.stat_best_run')}
            </p>
            <p className="mt-1 text-[1.65rem] font-bold tabular-nums tracking-tight leading-none text-[var(--text)]">
              {bestRun}
            </p>
            {bestRun !== '—' ? (
              <p className="mt-1.5 text-sm text-[var(--text-muted)]">{t('rollover.day')}</p>
            ) : null}
          </div>

          <div className="lg:col-span-5">
            <div className="flex divide-x divide-[var(--separator)] border-y border-[var(--separator)] py-5">
              <div className="min-w-0 flex-1 pr-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                  {t('rollover.stake')}
                </p>
                <p className="mt-2">
                  {stakeAmount ? (
                    <GhsFigure amount={stakeAmount} tone="in" size="lg" />
                  ) : (
                    <span className="text-[1.65rem] font-bold text-[var(--text-tertiary)]">—</span>
                  )}
                </p>
                <p className="mt-1.5 text-[12px] text-[var(--text-muted)]">{t('rollover.stat_stake_hint')}</p>
              </div>
              <div className="min-w-0 flex-1 pl-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                  {t('rollover.win')}
                </p>
                <p className="mt-2">
                  {winAmount ? (
                    <GhsFigure amount={winAmount} tone="out" size="lg" />
                  ) : (
                    <span className="text-[1.65rem] font-bold text-[var(--text-tertiary)]">—</span>
                  )}
                </p>
                <p className="mt-1.5 text-[12px] text-[var(--text-muted)] truncate">
                  {stakeAmount && winAmount
                    ? t('rollover.stat_from_stake', { stake: stakeAmount })
                    : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              {t('rollover.stat_campaigns')}
            </p>
            <dl className="mt-3 grid grid-cols-3 gap-3">
              {outcomeCounts.map((item) => (
                <div key={item.key}>
                  <dt className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">{item.label}</dt>
                  <dd className="mt-1 text-[1.65rem] font-bold tabular-nums tracking-tight leading-none text-[var(--text)]">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {lastEndedNote ? (
          <p className="text-xs text-[var(--text-muted)]">{lastEndedNote}</p>
        ) : null}

        <ul className="md:hidden overflow-hidden rounded-[var(--radius)] border border-[var(--separator)] bg-[var(--card)]">
          {board.days.map((day, i) => {
            const inPlay = day.status === 'pending' && day.ticketId != null;
            const weekBreak = day.dayNumber === 8 || day.dayNumber === 15 || day.dayNumber === 22;
            const reached = dayHasStarted(day.status);
            const inner = (
              <div className={`flex items-center gap-3 px-3.5 py-2.5 min-h-[52px] ${inPlay ? 'bg-[var(--primary-light)]/40' : ''}`}>
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
                        <MoneyCell amount={day.exampleStakeGhs} reached={reached} tone="in" />
                      </span>
                      <span className="min-w-0 truncate">
                        <span className="mr-1 uppercase tracking-wide text-[var(--text-tertiary)]">{t('rollover.win')}</span>
                        <MoneyCell amount={day.exampleReturnGhs} reached={reached} later={laterOdds} tone="out" />
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

        <Surface variant="flat" padding="none" className="hidden md:block overflow-hidden">
          <table className="w-full text-sm border-separate border-spacing-0">
            <caption className="sr-only">{t('rollover.plan_title')}</caption>
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                <th className="px-5 py-3 font-semibold border-b border-[var(--separator)]">{t('rollover.day')}</th>
                <th className="px-4 py-3 font-semibold border-b border-[var(--separator)]">{t('rollover.status')}</th>
                <th className="px-4 py-3 font-semibold border-b border-[var(--separator)]">{t('rollover.odds')}</th>
                <th className="px-4 py-3 font-semibold border-b border-[var(--separator)]">{t('rollover.stake')}</th>
                <th className="px-4 py-3 font-semibold border-b border-[var(--separator)]">{t('rollover.win')}</th>
                <th className="px-5 py-3 font-semibold border-b border-[var(--separator)]">{t('rollover.coupon')}</th>
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
                  ? 'bg-[var(--primary-light)]/40'
                  : won
                    ? 'bg-[var(--primary-light)]/15 hover:bg-[var(--primary-light)]/30'
                    : 'hover:bg-[var(--fill-secondary)]/40';
                const hairline = `${day.dayNumber === board.planDays ? 'border-b-0' : weekBreak ? 'border-[var(--border)]' : 'border-[var(--separator)]'}`;
                return (
                  <tr key={day.dayNumber} className={rowBg}>
                    <td className={`relative px-5 py-3 font-semibold tabular-nums border-b ${hairline}`}>
                      {featured ? (
                        <span className="absolute inset-y-0 left-0 w-[2px] bg-[var(--primary)]" aria-hidden />
                      ) : null}
                      <DayMark dayNumber={day.dayNumber} status={day.status} live={inPlay} />
                    </td>
                    <td className={`px-4 py-3 border-b ${hairline}`}>
                      <StatusCell status={day.status} label={t(statusKey(day.status))} />
                    </td>
                    <td
                      className={`px-4 py-3 tabular-nums border-b ${hairline} ${
                        day.combinedOdds != null ? 'font-semibold text-[var(--text)]' : 'text-[var(--text-tertiary)]'
                      }`}
                    >
                      {day.combinedOdds != null ? Number(day.combinedOdds).toFixed(2) : '·'}
                    </td>
                    <td className={`px-4 py-3 border-b ${hairline}`}>
                      <MoneyCell amount={day.exampleStakeGhs} reached={reached} tone="in" />
                    </td>
                    <td className={`px-4 py-3 border-b ${hairline}`}>
                      <MoneyCell amount={day.exampleReturnGhs} reached={reached} later={laterOdds} tone="out" />
                    </td>
                    <td className={`px-5 py-3 border-b ${hairline}`}>
                      {day.ticketId ? (
                        <Link
                          href={`/coupons/${day.ticketId}`}
                          className={buttonClassName({ variant: 'ghost', size: 'sm', className: 'min-h-[36px] px-2.5' })}
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
        </Surface>
      </section>

      <aside className="border-t border-[var(--separator)] pt-5 text-sm text-[var(--text-muted)]" role="note">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
          {t('rollover.disclaimer_label')}
        </p>
        <p className="mt-2 leading-relaxed max-w-3xl">{t('rollover.disclaimer')}</p>
        <p className="mt-2">
          <Link href="/responsible-gambling" className="font-medium text-[var(--text)] underline underline-offset-2">
            {t('resp.headline')}
          </Link>
        </p>
      </aside>
    </div>
  );
}
