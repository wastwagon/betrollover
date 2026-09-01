'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { PageHeader } from '@/components/PageHeader';
import { AdSlot } from '@/components/AdSlot';
import { PickCard } from '@/components/PickCard';
import { getPickCardSocialProps, mergeSocialCountsIntoList } from '@/lib/pick-card-social';
import { currentLoginRedirectPath } from '@/lib/login-redirect-path';
import { getApiUrl } from '@/lib/site-config';
import { useT } from '@/context/LanguageContext';
import { formatLiveFixturePeriod, FIXTURE_NS_CHIP } from '@/lib/live-fixture-display';
import { FixtureLiveChip } from '@/components/FixtureLiveChip';
import { isFixtureLive } from '@/lib/home-today-matches';
import type { PublicFixtureDetail } from '@/lib/match-detail';
import { buttonClassName } from '@/components/ui/Button';

const LIVE_REFRESH_MS = 30_000;

function formatKickoff(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

interface AccumulatorPick {
  id: number;
  title: string;
  totalOdds: number;
  totalPicks: number;
  price: number;
  status?: string;
  result?: string;
  picks?: unknown[];
  tipster?: unknown;
  createdAt?: string;
  bookmakerKey?: string | null;
  bookingCode?: string | null;
  bookingCodeCopyCount?: number;
  reactionCount?: number;
  hasReacted?: boolean;
  commentCount?: number;
}

export function MatchDetailClient({ initial }: { initial: PublicFixtureDetail }) {
  const t = useT();
  const [match, setMatch] = useState(initial);
  const [related, setRelated] = useState<AccumulatorPick[]>(
    (initial.relatedPicks.items as unknown as AccumulatorPick[]) ?? [],
  );

  useEffect(() => {
    if (!isFixtureLive(match.status)) return;

    const refresh = () => {
      fetch(`${getApiUrl()}/fixtures/platform/matches/${match.id}`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data?.found) return;
          setMatch((prev) => ({
            ...prev,
            status: data.status,
            statusElapsed: data.statusElapsed,
            homeScore: data.homeScore,
            awayScore: data.awayScore,
            htHomeScore: data.htHomeScore,
            htAwayScore: data.htAwayScore,
            spotlightPlayer: data.spotlightPlayer ?? prev.spotlightPlayer,
            standings: data.standings ?? prev.standings,
          }));
          if (Array.isArray(data.relatedPicks?.items)) {
            setRelated(data.relatedPicks.items as AccumulatorPick[]);
          }
        })
        .catch(() => {});
    };

    refresh();
    const id = window.setInterval(refresh, LIVE_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [match.id, match.status]);

  const live = isFixtureLive(match.status);
  const title = `${match.homeTeamName} vs ${match.awayTeamName}`;

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <UnifiedHeader />
      <main className="section-ux-page-wide w-full min-w-0">
        <Link
          href="/live-scores"
          className="inline-flex items-center text-sm font-medium text-[var(--primary)] hover:underline mb-3"
        >
          ← {t('match.back_live_scores')}
        </Link>
        <PageHeader
          label={match.leagueName ?? t('match.breadcrumb')}
          title={title}
          tagline={formatKickoff(match.matchDate)}
        />

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-8 mb-8 shadow-sm">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-[var(--text-muted)]">{formatKickoff(match.matchDate)}</p>
              {live ? (
                <FixtureLiveChip
                  label={formatLiveFixturePeriod(match.status, match.statusElapsed) || 'LIVE'}
                  className="px-3 py-1 text-xs"
                />
              ) : (
                <span className={`${FIXTURE_NS_CHIP} text-xs`}>
                  {match.status}
                </span>
              )}
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
              <div className="flex flex-col items-center text-center gap-2 min-w-0">
                {match.homeTeamLogo ? (
                  <Image
                    src={match.homeTeamLogo}
                    alt=""
                    width={64}
                    height={64}
                    className="h-14 w-14 sm:h-16 sm:w-16 object-contain"
                    unoptimized
                  />
                ) : (
                  <span className="h-14 w-14 rounded-full bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center text-lg font-bold">
                    {match.homeTeamName.slice(0, 1)}
                  </span>
                )}
                <p className="font-semibold text-[var(--text)] text-sm sm:text-base leading-tight">{match.homeTeamName}</p>
                {match.standings.home && (
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {t('match.table_rank', { rank: String(match.standings.home.rank) })} ·{' '}
                    {match.standings.home.points} pts
                  </p>
                )}
              </div>

              <div className="text-center px-2">
                <p className="text-3xl sm:text-4xl font-bold tabular-nums text-[var(--text)]">
                  {live || match.status === 'FT' ? (
                    <>
                      {match.homeScore ?? 0}
                      <span className="text-[var(--text-muted)] font-normal mx-1">:</span>
                      {match.awayScore ?? 0}
                    </>
                  ) : (
                    <span className="text-lg sm:text-xl text-[var(--text-muted)] font-semibold">vs</span>
                  )}
                </p>
                {match.htHomeScore != null && match.htAwayScore != null && (
                  <p className="text-xs text-[var(--text-muted)] mt-1 tabular-nums">
                    HT {match.htHomeScore}–{match.htAwayScore}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-center text-center gap-2 min-w-0">
                {match.awayTeamLogo ? (
                  <Image
                    src={match.awayTeamLogo}
                    alt=""
                    width={64}
                    height={64}
                    className="h-14 w-14 sm:h-16 sm:w-16 object-contain"
                    unoptimized
                  />
                ) : (
                  <span className="h-14 w-14 rounded-full bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center text-lg font-bold">
                    {match.awayTeamName.slice(0, 1)}
                  </span>
                )}
                <p className="font-semibold text-[var(--text)] text-sm sm:text-base leading-tight">{match.awayTeamName}</p>
                {match.standings.away && (
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {t('match.table_rank', { rank: String(match.standings.away.rank) })} ·{' '}
                    {match.standings.away.points} pts
                  </p>
                )}
              </div>
            </div>

            {match.spotlightPlayer && (
              <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)]/60 px-4 py-3">
                {match.spotlightPlayer.playerPhoto ? (
                  <Image
                    src={match.spotlightPlayer.playerPhoto}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover shrink-0"
                    unoptimized
                  />
                ) : (
                  <span className="h-10 w-10 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-sm font-bold shrink-0">
                    {match.spotlightPlayer.playerName.slice(0, 1)}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide font-semibold text-[var(--primary)]">
                    {t('home.today_matches_player_watch')}
                  </p>
                  <p className="text-sm font-semibold text-[var(--text)] truncate">
                    {match.spotlightPlayer.playerName}
                    <span className="text-[var(--text-muted)] font-normal">
                      {' '}
                      · {match.spotlightPlayer.teamName}
                    </span>
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Link
                href="/marketplace?sport=football"
                className={buttonClassName({ size: 'sm' })}
              >
                {t('match.browse_picks')}
              </Link>
              {match.leagueApiId != null && (
                <Link
                  href="/league-tables"
                  className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--text)] hover:border-[var(--primary)]/40"
                >
                  {t('match.full_table')}
                </Link>
              )}
            </div>
          </div>
        </div>

        <section className="mb-10">
          <div className="flex items-end justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text)]">{t('match.related_picks_title')}</h2>
              <p className="text-sm text-[var(--text-muted)] mt-0.5">{t('match.related_picks_sub')}</p>
            </div>
            {related.length > 0 && (
              <span className="text-xs font-semibold text-[var(--primary)] shrink-0">
                {t('match.picks_count', { count: String(match.relatedPicks.total) })}
              </span>
            )}
          </div>

          {related.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)]/50 px-6 py-10 text-center">
              <p className="text-sm text-[var(--text-muted)] mb-4">{t('match.no_picks_yet')}</p>
              <Link
                href="/marketplace?sport=football"
                className={buttonClassName({ size: 'sm' })}
              >
                {t('match.browse_picks')}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {related.map((a) => (
                <PickCard
                  key={a.id}
                  id={a.id}
                  title={a.title}
                  totalPicks={a.totalPicks}
                  totalOdds={a.totalOdds}
                  price={a.price}
                  status={a.status}
                  result={a.result}
                  picks={(a.picks as never[]) || []}
                  tipster={a.tipster as never}
                  createdAt={a.createdAt}
                  bookmakerKey={a.bookmakerKey}
                  bookingCode={a.bookingCode}
                  bookingCodeCopyCount={a.bookingCodeCopyCount ?? 0}
                  viewOnly
                  detailsHref={`/coupons/${a.id}`}
                  onPurchase={() => {}}
                  purchasing={false}
                  {...getPickCardSocialProps(a as unknown as Parameters<typeof getPickCardSocialProps>[0], {
                    onCountsChange: (id, counts) =>
                      setRelated((prev) => mergeSocialCountsIntoList(prev, id, counts)),
                    loginRedirectPath: currentLoginRedirectPath(`/matches/${match.id}`),
                  })}
                />
              ))}
            </div>
          )}
        </section>

        <AdSlot zoneSlug="between-sections" fullWidth className="mb-8" />
      </main>
      <AppFooter />
    </div>
  );
}
