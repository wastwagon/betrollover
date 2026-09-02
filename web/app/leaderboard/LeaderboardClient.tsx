'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { PageHeader } from '@/components/PageHeader';
import { AppFooter } from '@/components/AppFooter';
import { AdSlot } from '@/components/AdSlot';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { useT } from '@/context/LanguageContext';
import { getApiUrl, getAvatarUrl, shouldUnoptimizeGoogleAvatar } from '@/lib/site-config';
import { AUTH_STORAGE_SYNC } from '@/lib/auth-storage-sync';
import { tipsterRankMedal } from '@/lib/tipster-rank-ui';
import { AiTipsterBadge } from '@/components/AiTipsterBadge';
import { VerifiedTipsterBadge } from '@/components/VerifiedTipsterBadge';
import { PullToRefresh } from '@/components/ios/PullToRefresh';
import {
  LEADERBOARD_MIN_SETTLED_FOR_PRIMARY_RANKING,
  LEADERBOARD_MIN_SETTLED_WEEKLY,
  TIPSTER_ACTIVE_WITHIN_DAYS,
  TIPSTER_FORM_POST_CAP,
} from '@betrollover/shared-types';
import { isFootballOnlyDiscovery } from '@/lib/football-only-discovery';
import { isSubscriptionsEnabled } from '@/lib/subscriptions-enabled';
import { Button, buttonClassName } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ios/SegmentedControl';

type Period = 'all_time' | 'monthly' | 'weekly';
type SportFilter = 'all' | 'football' | 'basketball' | 'rugby' | 'mma' | 'volleyball' | 'hockey' | 'american_football';

interface LeaderboardEntry {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  rank: number;
  leaderboard_rank?: number;
  win_rate: number;
  roi: number;
  total_predictions: number;
  total_wins: number;
  total_losses?: number;
  monthly_predictions?: number;
  monthly_wins?: number;
  monthly_roi?: number;
  avg_rating?: number | null;
  review_count?: number | null;
  is_ai?: boolean;
  is_verified?: boolean;
  tipster_type?: string | null;
  form_points?: number;
  /** Active VIP package id from API when tipster sells a subscription plan. */
  vip_package_id?: number | null;
}

interface MySubscriptionRow {
  packageId: number;
  status: string;
  endsAt: string;
}

function activeSubscriptionPackageIds(subs: MySubscriptionRow[]): Set<number> {
  const now = Date.now();
  const ids = new Set<number>();
  for (const s of subs) {
    if (s.status !== 'active') continue;
    const end = s.endsAt ? new Date(s.endsAt).getTime() : 0;
    if (end <= now) continue;
    if (typeof s.packageId === 'number' && Number.isFinite(s.packageId)) ids.add(s.packageId);
  }
  return ids;
}

function mapLeaderboardEntry(e: Record<string, unknown>, i: number): LeaderboardEntry {
  return {
    id: e.id as number,
    username: e.username as string,
    display_name: e.display_name as string,
    avatar_url: (e.avatar_url as string | null) ?? null,
    rank: (e.rank ?? e.leaderboard_rank ?? i + 1) as number,
    win_rate: (e.win_rate as number) ?? 0,
    roi: (e.roi as number) ?? 0,
    total_predictions: (e.total_predictions ?? e.monthly_predictions ?? 0) as number,
    total_wins: (e.total_wins ?? e.monthly_wins ?? 0) as number,
    total_losses: typeof e.total_losses === 'number' ? e.total_losses : undefined,
    is_ai: !!(e.is_ai as boolean | undefined),
    is_verified: !!(e.is_verified as boolean | undefined),
    tipster_type: (e.tipster_type as string | null | undefined) ?? null,
    form_points: typeof e.form_points === 'number' ? e.form_points : undefined,
    avg_rating: (e.avg_rating as number | null | undefined) ?? null,
    review_count: (e.review_count as number | null | undefined) ?? null,
    vip_package_id: (e.vip_package_id as number | null | undefined) ?? null,
  };
}

function RankBadge({ rank }: { rank: number }) {
  const medal = tipsterRankMedal(rank);
  if (medal) return <span className="text-2xl">{medal}</span>;
  return (
    <span className="w-9 h-9 flex items-center justify-center rounded-full bg-[var(--fill-secondary)] text-[var(--text-muted)] text-sm font-bold">
      {rank}
    </span>
  );
}

export default function LeaderboardPage({
  initialEntries = [],
}: {
  initialEntries?: Record<string, unknown>[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  const [entries, setEntries] = useState<LeaderboardEntry[]>(() => initialEntries.map(mapLeaderboardEntry));
  const [loading, setLoading] = useState(initialEntries.length === 0);
  const skipNextLoadingRef = useRef(initialEntries.length > 0);
  const [period, setPeriod] = useState<Period>('all_time');
  const [sport, setSport] = useState<SportFilter>('all');
  const [loggedIn, setLoggedIn] = useState(false);
  const [meResolved, setMeResolved] = useState(false);
  const [subscribedPackageIds, setSubscribedPackageIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const sync = () => setLoggedIn(!!(typeof window !== 'undefined' && localStorage.getItem('token')));
    sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === null) sync();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(AUTH_STORAGE_SYNC, sync);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(AUTH_STORAGE_SYNC, sync);
    };
  }, [pathname]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setMeResolved(true);
      return;
    }
    const apiUrl = getApiUrl();
    fetch(`${apiUrl}/subscriptions/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((raw: unknown) => {
        const subs = Array.isArray(raw) ? (raw as MySubscriptionRow[]) : [];
        setSubscribedPackageIds(activeSubscriptionPackageIds(subs));
      })
      .catch(() => setSubscribedPackageIds(new Set()))
      .finally(() => setMeResolved(true));
  }, []);

  const fetchLeaderboard = useCallback((p: Period, s: SportFilter, silent = false) => {
    const skipLoading = silent || skipNextLoadingRef.current;
    skipNextLoadingRef.current = false;
    if (!skipLoading) setLoading(true);
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    // Same list as homepage Top Performing: GET /leaderboard rank is form order among active posters.
    const params = new URLSearchParams({ limit: '50' });
    if (p !== 'all_time') params.set('period', p);
    if (s !== 'all') params.set('sport', s);
    const endpoint = `${getApiUrl()}/leaderboard?${params}`;

    fetch(endpoint, { headers, cache: 'no-store' })
      .then(r => r.ok ? r.json() : { leaderboard: [], tipsters: [] })
      .then(data => {
        const raw: Record<string, unknown>[] = data.leaderboard ?? data.tipsters ?? data ?? [];
        setEntries(raw.map(mapLeaderboardEntry));
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchLeaderboard(period, sport); }, [period, sport, fetchLeaderboard]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchLeaderboard(period, sport, true);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [period, sport, fetchLeaderboard]);

  const handleFollow = async (username: string) => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login?redirect=/leaderboard'); return; }
    await fetch(`${getApiUrl()}/tipsters/${encodeURIComponent(username)}/follow`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <UnifiedHeader />
      <main className="section-ux-page w-full min-w-0">
        <PullToRefresh
          onRefresh={() => {
            fetchLeaderboard(period, sport);
            return Promise.resolve();
          }}
          disabled={loading}
        >
        <PageHeader
          label={t('nav.leaderboard')}
          title={t('seo.leaderboard_title').split(' | ')[0]}
          tagline={t('seo.leaderboard_desc')}
        />

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 mb-6 min-w-0 max-w-full">
          <Link
            href="/tipsters"
            className={buttonClassName({ variant: 'secondary', size: 'sm', className: 'w-full sm:w-auto' })}
          >
            {t('nav.tipsters')}
          </Link>
          <Link
            href="/create-pick"
            className={buttonClassName({ variant: 'secondary', size: 'sm', className: 'w-full sm:w-auto' })}
          >
            {t('nav.create_pick')}
          </Link>
        </div>

        {/* Period tabs */}
        <div className="mb-4 w-full min-w-0">
          <SegmentedControl
            aria-label={t('tipster.period_alltime')}
            className="max-w-none"
            options={[
              { value: 'all_time' as Period, label: t('tipster.period_alltime') },
              { value: 'monthly' as Period, label: t('tipster.period_monthly') },
              { value: 'weekly' as Period, label: t('tipster.period_weekly') },
            ]}
            value={period}
            onChange={setPeriod}
          />
        </div>

        {/* Full-width ad */}
        <div className="mb-8 w-full">
          <AdSlot zoneSlug="leaderboard-full" fullWidth className="w-full max-w-3xl mx-auto" />
        </div>

        {/* Sport filter — hidden in football-only discovery */}
        {!isFootballOnlyDiscovery() ? (
        <div className="mb-8 w-full min-w-0 overflow-hidden">
        <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 scrollbar-hide -mx-1 px-1 touch-pan-x [-webkit-overflow-scrolling:touch]">
          {([
            { key: 'all' as SportFilter,               icon: '🌍', labelKey: 'marketplace.filter_all_sports' },
            { key: 'football' as SportFilter,          icon: '⚽', labelKey: 'nav.football' },
            { key: 'basketball' as SportFilter,        icon: '🏀', labelKey: 'nav.basketball' },
            { key: 'rugby' as SportFilter,             icon: '🏉', labelKey: 'nav.rugby' },
            { key: 'mma' as SportFilter,               icon: '🥊', labelKey: 'nav.mma' },
            { key: 'volleyball' as SportFilter,        icon: '🏐', labelKey: 'nav.volleyball' },
            { key: 'hockey' as SportFilter,            icon: '🏒', labelKey: 'nav.hockey' },
            { key: 'american_football' as SportFilter, icon: '🏈', labelKey: 'nav.american_football' },
          ]).map(s => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSport(s.key)}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                sport === s.key
                  ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                  : 'bg-[var(--card)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
              }`}
            >
              <span>{s.icon}</span><span>{t(s.labelKey)}</span>
            </button>
          ))}
        </div>
        </div>
        ) : null}

        <div
          className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--card)]/80 px-3 py-3 sm:px-4 sm:py-3.5 text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed max-w-4xl"
          role="note"
        >
          <p className="font-semibold text-[var(--text)] mb-1.5">{t('leaderboard.important_note_title')}</p>
          <p className="m-0">
            {period === 'all_time'
              ? t('leaderboard.rank_notice_all_time', {
                  n: String(LEADERBOARD_MIN_SETTLED_FOR_PRIMARY_RANKING),
                  days: String(TIPSTER_ACTIVE_WITHIN_DAYS),
                  cap: String(TIPSTER_FORM_POST_CAP),
                })
              : period === 'weekly'
                ? t('leaderboard.rank_notice_weekly', { n: String(LEADERBOARD_MIN_SETTLED_WEEKLY) })
                : t('leaderboard.rank_notice_monthly', {
                    n: String(LEADERBOARD_MIN_SETTLED_FOR_PRIMARY_RANKING),
                  })}
          </p>
        </div>

        {/* Table */}
        {loading ? (
          <LoadingSkeleton count={10} variant="list" />
        ) : entries.length === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
            <p className="font-display text-[var(--text)] font-semibold">{t('common.no_results')}</p>
            <p className="text-[var(--text-muted)] text-sm mt-1 max-w-md mx-auto">
              {loggedIn ? t('leaderboard.empty_logged_sub') : t('home.join_subtitle')}
            </p>
            {loggedIn ? (
              <Link
                href="/tipsters"
                className={buttonClassName({ className: 'mt-4' })}
              >
                {t('leaderboard.empty_logged_cta')} →
              </Link>
            ) : (
              <Link href="/register" className={buttonClassName({ className: 'mt-4' })}>
                {t('nav.register')} →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2 min-w-0">
            {/* Desktop table header */}
            <div className="hidden md:grid grid-cols-[3rem_1fr_5rem_8rem_8rem_8rem_10rem] gap-4 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] min-w-0">
              <span>#</span>
              <span>{t('nav.tipsters')}</span>
              <span className="text-center" title={t('leaderboard.form_hint', { days: String(TIPSTER_ACTIVE_WITHIN_DAYS), cap: String(TIPSTER_FORM_POST_CAP) })}>{t('leaderboard.form_col')}</span>
              <span className="text-center">{t('tipster.win_rate')}</span>
              <span className="text-center">{t('tipster.roi')}</span>
              <span className="text-center">{t('tipster.total_picks')}</span>
              <span className="text-center">{t('leaderboard.actions_col')}</span>
            </div>

            {entries.map((entry, idx) => {
              // Use API win_rate (settled-only won/(won+lost)). Do not use total_wins/total_predictions:
              // total_predictions includes pending picks, which wrongly dilutes win rate vs profile/leaderboard API.
              const winRate = Number(entry.win_rate) || 0;
              const rank = entry.rank ?? entry.leaderboard_rank ?? idx + 1;
              const roi = entry.roi ?? 0;
              const settledCount =
                (Number(entry.total_wins) || 0) +
                (entry.total_losses != null
                  ? Number(entry.total_losses) || 0
                  : Math.max(0, (Number(entry.total_predictions) || 0) - (Number(entry.total_wins) || 0)));
              const earlySample =
                settledCount > 0 &&
                settledCount <
                  (period === 'weekly'
                    ? LEADERBOARD_MIN_SETTLED_WEEKLY
                    : LEADERBOARD_MIN_SETTLED_FOR_PRIMARY_RANKING);
              const avatarSrc = getAvatarUrl(entry.avatar_url, 48);
              const hasVipPackage =
                isSubscriptionsEnabled() && entry.vip_package_id != null && entry.vip_package_id > 0;
              const subbedToThisVip =
                hasVipPackage &&
                meResolved &&
                subscribedPackageIds.has(entry.vip_package_id as number);

              const joinVipClasses =
                'inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-light)] text-[var(--accent)] border border-[var(--accent)]/40 hover:opacity-90 transition-colors w-full md:w-auto md:min-w-[7.5rem]';
              const subscribedVipClasses =
                'inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--text-muted)]/15 text-[var(--text-muted)] border border-[var(--border)] cursor-default w-full md:w-auto md:min-w-[7.5rem]';

              return (
                <div
                  key={entry.id}
                  className={`flex flex-col rounded-2xl border transition-colors hover:border-[var(--primary)]/30 min-w-0 w-full max-w-full overflow-x-hidden ${
                    rank <= 3
                      ? 'bg-[var(--card)] border-[var(--accent)]/35'
                      : 'bg-[var(--card)] border-[var(--border)]'
                  }`}
                >
                <div
                  className={`flex flex-wrap md:grid md:grid-cols-[3rem_1fr_5rem_8rem_8rem_8rem_10rem] items-center gap-3 md:gap-4 px-4 py-3.5 min-w-0 w-full max-w-full overflow-x-hidden`}
                >
                  <div className="shrink-0"><RankBadge rank={rank} /></div>

                  {/* Tipster info */}
                  <Link href={`/tipsters/${entry.username}`} className="flex flex-1 items-center gap-3 min-w-0 max-w-full group md:max-w-none md:flex-initial">
                    <div className="relative w-10 h-10 flex-shrink-0">
                      {avatarSrc ? (
                        <Image
                          src={avatarSrc}
                          alt={entry.display_name}
                          width={40} height={40}
                          className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                          unoptimized={shouldUnoptimizeGoogleAvatar(avatarSrc)}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full border-2 border-[var(--card)] bg-[var(--primary-light)] flex items-center justify-center text-sm font-bold text-[var(--primary)]">
                          {entry.display_name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[var(--text)] group-hover:text-[var(--primary)] transition-colors flex flex-wrap items-center gap-2 min-w-0">
                        <span className="truncate min-w-0 max-w-full">{entry.display_name}</span>
                        {entry.is_ai ? <AiTipsterBadge tipsterType={entry.tipster_type} /> : null}
                        {!entry.is_ai && entry.is_verified ? <VerifiedTipsterBadge /> : null}
                        {earlySample ? (
                          <span
                            className="inline-flex items-center rounded-md bg-[var(--accent-light)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]"
                            title={t('tipster.early_sample_hint', {
                              n: String(
                                period === 'weekly'
                                  ? LEADERBOARD_MIN_SETTLED_WEEKLY
                                  : LEADERBOARD_MIN_SETTLED_FOR_PRIMARY_RANKING,
                              ),
                            })}
                          >
                            {t('tipster.early_sample')}
                          </span>
                        ) : null}
                      </p>
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        <p className="text-xs text-[var(--text-muted)] truncate min-w-0">@{entry.username}</p>
                        {entry.avg_rating != null && entry.avg_rating > 0 && (
                          <span className="flex items-center gap-0.5 shrink-0">
                            <span className="text-[var(--accent)] text-[10px]">★</span>
                            <span className="text-[10px] font-semibold text-[var(--accent)]">{Number(entry.avg_rating).toFixed(1)}</span>
                            {entry.review_count != null && entry.review_count > 0 && (
                              <span className="text-[10px] text-[var(--text-muted)]">({entry.review_count})</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>

                  {/* Stats */}
                  <div className="hidden md:flex flex-col items-center">
                    <span className="text-sm font-bold text-[var(--text)]">
                      {period === 'all_time' && entry.form_points != null ? entry.form_points : '—'}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">{t('leaderboard.form_col')}</span>
                  </div>
                  <div className="hidden md:flex flex-col items-center">
                    <span className={`text-sm font-bold ${winRate >= 60 ? 'text-[var(--success)]' : winRate >= 40 ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}>
                      {winRate.toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">{t('tipster.win_rate')}</span>
                  </div>
                  <div className="hidden md:flex flex-col items-center">
                    <span className={`text-sm font-bold ${roi > 0 ? 'text-[var(--success)]' : roi < 0 ? 'text-[var(--destructive)]' : 'text-[var(--text)]'}`}>
                      {roi > 0 ? '+' : ''}{roi.toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">{t('tipster.roi')}</span>
                  </div>
                  <div className="hidden md:flex flex-col items-center">
                    <span className="text-sm font-bold text-[var(--text)]">{entry.total_predictions}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{t('tipster.total_picks')}</span>
                  </div>

                  {/* Mobile stats — own row so Form/WR/ROI never collide with the name. */}
                  <div className="md:hidden basis-full flex flex-wrap items-center gap-x-3 gap-y-0.5 min-w-0 pl-[3.25rem]">
                    {period === 'all_time' && entry.form_points != null ? (
                      <span className="text-xs font-bold text-[var(--text)] tabular-nums">
                        {entry.form_points} {t('leaderboard.form_col')}
                      </span>
                    ) : null}
                    <span className={`text-xs font-bold tabular-nums ${winRate >= 60 ? 'text-[var(--success)]' : 'text-[var(--text)]'}`}>
                      {winRate.toFixed(0)}% {t('tipster.win_rate_short')}
                    </span>
                    <span className={`text-xs font-bold tabular-nums ${roi > 0 ? 'text-[var(--success)]' : 'text-[var(--destructive)]'}`}>
                      {roi > 0 ? '+' : ''}{roi.toFixed(1)}% {t('tipster.roi')}
                    </span>
                  </div>

                  <div className="hidden md:flex items-center justify-center gap-2 flex-wrap">
                    {hasVipPackage ? (
                      !meResolved ? (
                        <div
                          className="h-8 min-w-[7.5rem] rounded-lg bg-[var(--bg)] border border-[var(--border)] animate-pulse"
                          aria-hidden
                        />
                      ) : subbedToThisVip ? (
                        <div
                          className={subscribedVipClasses}
                          role="status"
                          title={t('subscriptions.vip_already_subscribed_hint')}
                        >
                          {t('tipster.subscribed')}
                        </div>
                      ) : (
                        <Link
                          href={`/subscriptions/checkout?packageId=${entry.vip_package_id}`}
                          className={joinVipClasses}
                        >
                          {t('tipster.join_vip')}
                        </Link>
                      )
                    ) : null}
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/tipsters/${entry.username}`}
                        className={buttonClassName({ size: 'sm', variant: 'secondary', className: 'bg-[var(--primary-light)] text-[var(--primary)] border-transparent hover:bg-[var(--primary)] hover:text-white' })}
                      >
                        {t('common.view')}
                      </Link>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleFollow(entry.username)}
                      >
                        {t('tipster.follow')}
                      </Button>
                    </div>
                  </div>
                </div>

                  <div className="md:hidden flex items-center gap-2 flex-wrap justify-end px-4 pb-3.5 pt-2 border-t border-[var(--border)]/50">
                    {hasVipPackage ? (
                      !meResolved ? (
                        <div className="h-8 min-w-[7.5rem] rounded-lg bg-[var(--bg)] border border-[var(--border)] animate-pulse" aria-hidden />
                      ) : subbedToThisVip ? (
                        <div
                          className={subscribedVipClasses}
                          role="status"
                          title={t('subscriptions.vip_already_subscribed_hint')}
                        >
                          {t('tipster.subscribed')}
                        </div>
                      ) : (
                        <Link href={`/subscriptions/checkout?packageId=${entry.vip_package_id}`} className={joinVipClasses}>
                          {t('tipster.join_vip')}
                        </Link>
                      )
                    ) : null}
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/tipsters/${entry.username}`}
                        className={buttonClassName({ size: 'sm', variant: 'secondary', className: 'bg-[var(--primary-light)] text-[var(--primary)] border-transparent hover:bg-[var(--primary)] hover:text-white' })}
                      >
                        {t('common.view')}
                      </Link>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleFollow(entry.username)}
                      >
                        {t('tipster.follow')}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/tipsters" className="text-sm font-medium text-[var(--primary)] hover:underline">
            {t('tipster.browse_tipsters')}
          </Link>
        </div>
        </PullToRefresh>
      </main>
      <AppFooter />
    </div>
  );
}
