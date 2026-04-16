'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getAvatarUrl, shouldUnoptimizeGoogleAvatar } from '@/lib/site-config';
import { TeamBadge } from './TeamBadge';
import { useCurrency } from '@/context/CurrencyContext';
import { useT } from '@/context/LanguageContext';
import { formatLiveFixturePeriod } from '@/lib/live-fixture-display';
import { tipsterRankBadgeClass, tipsterRankBadgeContent } from '@/lib/tipster-rank-ui';
import { formatFootballOutcomeLabel } from '@betrollover/shared-types';
import { AiTipsterBadge } from '@/components/AiTipsterBadge';

interface Pick {
  id?: number;
  matchDescription?: string;
  prediction?: string;
  odds?: number;
  matchDate?: string | Date;
  homeScore?: number | null;
  awayScore?: number | null;
  fixtureStatus?: string | null;
  /** Live minute from API when fixture is in-play */
  fixtureStatusElapsed?: number | null;
  status?: string;
  /** Pick-level result (won/lost/void) - when set, match is finished */
  result?: string;
  homeTeamLogo?: string | null;
  awayTeamLogo?: string | null;
  homeCountryCode?: string | null;
  awayCountryCode?: string | null;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
}

interface Tipster {
  id?: number;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  /** Platform AI tipster (from API `isAi`; some payloads use `is_ai`). */
  isAi?: boolean;
  is_ai?: boolean;
  winRate: number;
  roi?: number;
  totalPicks: number;
  wonPicks: number;
  lostPicks: number;
  /** Global all-time leaderboard rank; null if not on leaderboard (e.g. no settled picks). */
  rank: number | null;
}

function tipsterShowsAiBadge(t: Tipster | null | undefined): boolean {
  if (!t) return false;
  return t.isAi === true || t.is_ai === true;
}

const SPORT_META: Record<string, { icon: string; label: string; color: string }> = {
  football:          { icon: '⚽', label: 'Football',          color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  basketball:        { icon: '🏀', label: 'Basketball',        color: 'bg-orange-100 text-orange-800 border-orange-200' },
  rugby:             { icon: '🏉', label: 'Rugby',             color: 'bg-amber-100 text-amber-800 border-amber-200' },
  mma:               { icon: '🥊', label: 'MMA',               color: 'bg-red-100 text-red-800 border-red-200' },
  volleyball:        { icon: '🏐', label: 'Volleyball',        color: 'bg-blue-100 text-blue-800 border-blue-200' },
  hockey:            { icon: '🏒', label: 'Hockey',            color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  american_football: { icon: '🏈', label: 'Amer. Football',   color: 'bg-purple-100 text-purple-800 border-purple-200' },
  tennis:            { icon: '🎾', label: 'Tennis',            color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  'multi-sport':     { icon: '🌍', label: 'Multi-Sport',       color: 'bg-teal-100 text-teal-800 border-teal-200' },
  multi:             { icon: '🌍', label: 'Multi-Sport',       color: 'bg-teal-100 text-teal-800 border-teal-200' },
};

interface PickCardProps {
  id: number;
  title: string;
  totalPicks: number;
  totalOdds: number;
  price: number;
  sport?: string;
  status?: string;
  result?: string;
  picks: Pick[];
  purchaseCount?: number;
  reactionCount?: number;
  hasReacted?: boolean;
  reacting?: boolean;
  onReact?: () => void;
  onView?: () => void;
  tipster?: Tipster | null;
  isPurchased?: boolean;
  canPurchase?: boolean;
  /** When true, shows View Details only (no purchase). Used for admin marketplace. */
  viewOnly?: boolean;
  /** When set with viewOnly, View Details links to this URL instead of opening modal. */
  detailsHref?: string;
  walletBalance?: number | null;
  onPurchase: () => void;
  purchasing?: boolean;
  showUnveil?: boolean;
  onUnveilClose?: () => void;
  className?: string;
  createdAt?: string;
  /** Follow tipster - when set, shows compact follow button at top right */
  isFollowing?: boolean;
  onFollow?: () => void;
  followLoading?: boolean;
  /** Buyer review summary for this coupon */
  avgRating?: number | null;
  reviewCount?: number | null;
  /** From API: viewer may see full legs (purchase, subscription, free/settled, seller, admin). Drives View vs Purchase CTA when true. */
  picksRevealed?: boolean;
}

export function PickCard({
  id,
  title,
  totalPicks,
  totalOdds,
  price,
  sport,
  status,
  result,
  picks,
  purchaseCount,
  tipster,
  isPurchased = false,
  canPurchase = true,
  viewOnly = false,
  detailsHref,
  walletBalance,
  onPurchase,
  purchasing = false,
  showUnveil = false,
  onUnveilClose,
  reactionCount = 0,
  hasReacted = false,
  reacting = false,
  onReact,
  onView,
  className = '',
  createdAt,
  isFollowing = false,
  onFollow,
  followLoading = false,
  avgRating,
  reviewCount,
  picksRevealed = false,
}: PickCardProps) {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showUnveilModal, setShowUnveilModal] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const t = useT();
  const { format, currency } = useCurrency();

  /** Price display: primary in selected currency, secondary shows GHS if different */
  const priceDisplay = price > 0 ? format(price, { showOriginal: true }) : null;

  // Update unveil modal when prop changes
  useEffect(() => {
    if (showUnveil) {
      setShowUnveilModal(true);
    }
  }, [showUnveil]);

  const isFree = price === 0;
  const showFullDetails = isFree || isPurchased || viewOnly || picksRevealed;
  /** Match primary CTA to server-granted leg visibility (subscription, settled, etc.). */
  const showAccessCTA = isPurchased || viewOnly || isFree || picksRevealed;

  const purchaseActivityLabel =
    purchaseCount !== undefined && purchaseCount > 0
      ? isFree
        ? purchaseCount === 1
          ? t('pick_card.badge_free_unlocks_one')
          : t('pick_card.badge_free_unlocks_other', { n: String(purchaseCount) })
        : purchaseCount === 1
          ? t('pick_card.badge_purchases_one')
          : t('pick_card.badge_purchases_other', { n: String(purchaseCount) })
      : null;

  const statusColors: Record<string, string> = {
    pending_approval: 'bg-amber-200 text-amber-900',
    active: 'bg-emerald-200 text-emerald-900',
    won: 'bg-emerald-200 text-emerald-900',
    lost: 'bg-red-200 text-red-900',
    cancelled: 'bg-slate-200 text-slate-700',
    void: 'bg-slate-200 text-slate-700',
  };
  const displayStatus = result && ['won', 'lost', 'void'].includes(result) ? result : status;
  const statusColor = displayStatus ? statusColors[displayStatus] || 'bg-slate-100 text-slate-600' : '';

  const handlePurchase = () => {
    onPurchase();
  };

  const handleViewDetails = () => {
    onView?.();
    if (isPurchased) {
      setShowUnveilModal(true);
    } else {
      setShowDetailsModal(true);
    }
  };

  return (
    <>
      <article
        className={`card-gradient rounded-xl shadow-md overflow-hidden hover:shadow-lg hover:shadow-[var(--primary)]/5 hover:-translate-y-px transition-all duration-200 flex flex-col relative border border-[var(--border)] ${className}`}
      >
        {/* Compact Follow button - top right corner */}
        {tipster && onFollow && (
          <div className="absolute top-1.5 right-1.5 z-10">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onFollow(); }}
              disabled={followLoading || isFollowing}
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors ${
                isFollowing
                  ? 'bg-[var(--border)] text-[var(--text-muted)] cursor-default'
                  : 'bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white'
              } ${followLoading ? 'opacity-70' : ''}`}
            >
              {followLoading ? '…' : isFollowing ? t('pick_card.following') : t('pick_card.follow')}
            </button>
          </div>
        )}
        <div className="p-3 flex flex-col flex-1">
          {/* Tipster Performance Header - compact */}
          {(tipster || title) && (
            <div className="mb-2 pb-2 border-b border-[var(--border)]/80">
              <div className="flex items-center gap-2">
                {tipster?.avatarUrl && !avatarError ? (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden bg-[var(--border)] relative">
                    <Image
                      src={getAvatarUrl(tipster.avatarUrl, 28)!}
                      alt={tipster.displayName}
                      width={28}
                      height={28}
                      className="w-full h-full object-cover"
                      unoptimized={shouldUnoptimizeGoogleAvatar(getAvatarUrl(tipster.avatarUrl, 28))}
                      onError={() => setAvatarError(true)}
                    />
                  </div>
                ) : (
                  <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold ${tipster ? tipsterRankBadgeClass(tipster.rank) : 'bg-slate-200 text-slate-700'}`}>
                    {tipster ? tipsterRankBadgeContent(tipster.rank) : '?'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="font-medium text-xs text-[var(--text)] truncate min-w-0" title={tipster ? `${t('pick_card.tipster')}: ${tipster.displayName}` : t('pick_card.tipster')}>
                      {tipster?.displayName || t('pick_card.tipster')}
                    </p>
                    {tipsterShowsAiBadge(tipster) ? <AiTipsterBadge className="!text-[9px] !px-1.5 !py-px" /> : null}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0">
                    <span className="text-[9px] text-[var(--text-muted)]">
                      {tipster ? `${tipster.totalPicks}p` : `${totalPicks}p`}
                    </span>
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                      {tipster?.winRate != null ? `${Number(tipster.winRate).toFixed(1)}%` : '—'}
                    </span>
                    {tipster?.roi != null && (
                      <span
                        className={`text-[9px] font-bold ${
                          Number(tipster.roi) > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : Number(tipster.roi) < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {`${Number(tipster.roi).toFixed(1)}% ROI`}
                      </span>
                    )}
                    {tipster && (tipster.wonPicks > 0 || tipster.lostPicks > 0) && (
                      <span className="text-[9px] text-[var(--text-muted)]">
                        {tipster.wonPicks}W / {tipster.lostPicks}L
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 flex items-center gap-1">
                  {avgRating != null && avgRating > 0 && (
                    <span className="flex items-center gap-0.5">
                      <span className="text-amber-400 text-[10px]">★</span>
                      <span className="text-[9px] font-semibold text-amber-600">{Number(avgRating).toFixed(1)}</span>
                      {reviewCount != null && reviewCount > 0 && (
                        <span className="text-[9px] text-[var(--text-muted)]">({reviewCount})</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Coupon title & summary */}
          <div className="mb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap min-h-[1.875rem] min-w-0">
              {title ? (
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/25 text-[var(--text)] font-medium text-xs truncate max-w-full min-w-0 flex-1"
                  title={title}
                >
                  <span className="flex-shrink-0 text-[var(--primary)] opacity-80" aria-hidden>#</span>
                  <span className="truncate">{title}</span>
                </span>
              ) : (
                <span
                  className="flex-1 min-w-0 inline-flex items-center px-2 py-1 rounded-lg border border-transparent text-xs"
                  aria-hidden
                />
              )}
              <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap flex-shrink-0">
                {t('pick_card.picks_odds', { n: String(totalPicks), odds: Number(totalOdds).toFixed(2) })}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {purchaseActivityLabel && (
                <span
                  className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold border shadow-sm ${
                    isFree
                      ? 'bg-violet-50 text-violet-900 border-violet-200 dark:bg-violet-950/50 dark:text-violet-100 dark:border-violet-700/60'
                      : 'bg-amber-50 text-amber-950 border-amber-300 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-700/60'
                  }`}
                  title={isFree ? t('pick_card.badge_free_unlocks_hint') : t('pick_card.badge_purchases_hint')}
                >
                  <span aria-hidden className="opacity-90">
                    {isFree ? '✓' : '🛒'}
                  </span>
                  {purchaseActivityLabel}
                </span>
              )}
              {createdAt && (
                <span className="text-[9px] text-[var(--text-muted)]">
                  {new Date(createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {sport && SPORT_META[sport.toLowerCase()] && (
                <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium border ${SPORT_META[sport.toLowerCase()].color}`}>
                  {SPORT_META[sport.toLowerCase()].icon} {SPORT_META[sport.toLowerCase()].label}
                </span>
              )}
              {displayStatus && (
                <span className={`inline-flex px-1 py-0.5 rounded text-[9px] font-medium ${statusColor}`}>
                  {t(`status.${displayStatus}` as any) || displayStatus.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            {price > 0 && priceDisplay && (
              <div className="mt-1">
                <span className="text-sm font-bold text-[var(--primary)]">
                  {priceDisplay.primary}
                </span>
                {priceDisplay.original && (
                  <span className="ml-1 text-[9px] text-[var(--text-muted)]">({priceDisplay.original})</span>
                )}
              </div>
            )}
          </div>

          {/* Pick Details - Show for free or purchased coupons */}
          {showFullDetails && picks.length > 0 && (
            <div className="mb-2 flex-1">
              <ul className="space-y-1">
                {picks.slice(0, 3).map((p, i) => {
                  const matchDate = p.matchDate ? new Date(p.matchDate) : null;
                  const pickSettled = ['won', 'lost'].includes(p.result || '');
                  const isStarted = matchDate ? matchDate <= new Date() : false;
                  const hasLiveScore = p.homeScore != null && p.awayScore != null;
                  const isLive =
                    !pickSettled &&
                    ['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE'].includes(p.fixtureStatus || '');
                  const isFinished = pickSettled || ['FT', 'AET', 'PEN'].includes(p.fixtureStatus || '');
                  return (
                    <li key={i} className="flex flex-col gap-0 text-[11px]">
                      <div className="flex justify-between items-start gap-1.5 min-w-0">
                        <span className={`text-[var(--text)] font-medium truncate flex-1 flex items-center gap-1 min-w-0 ${isStarted ? 'line-through opacity-60' : ''}`}>
                          {(p.homeTeamLogo || p.awayTeamLogo || p.homeCountryCode || p.awayCountryCode) && (
                            <span className="flex items-center gap-0.5 flex-shrink-0">
                              <TeamBadge logo={p.homeTeamLogo} countryCode={p.homeCountryCode} name={p.homeTeamName || undefined} size={14} />
                              <TeamBadge logo={p.awayTeamLogo} countryCode={p.awayCountryCode} name={p.awayTeamName || undefined} size={14} />
                            </span>
                          )}
                          <span className="truncate">{p.matchDescription}</span>
                        </span>
                        <span className="text-[var(--text-muted)] flex-shrink-0 text-[9px]">
                          {formatFootballOutcomeLabel(p.prediction)} @ {Number(p.odds || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(matchDate || hasLiveScore) && (
                          <span className={`text-[9px] ${isFinished ? 'text-emerald-600 dark:text-emerald-400' : isLive ? 'text-red-600 dark:text-red-400' : isStarted ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--text-muted)]'}`}>
                            {isFinished
                              ? (hasLiveScore ? `🏁 FT ${p.homeScore}-${p.awayScore}` : '🏁 FT')
                              : isLive
                                ? (hasLiveScore
                                    ? `🔴 ${formatLiveFixturePeriod(p.fixtureStatus, p.fixtureStatusElapsed)} ${p.homeScore}-${p.awayScore}`
                                    : `🔴 ${formatLiveFixturePeriod(p.fixtureStatus, p.fixtureStatusElapsed)}`)
                                : isStarted
                                  ? '⏱ Started'
                                  : matchDate
                                    ? `⏰ ${new Date(matchDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                                    : null}
                          </span>
                        )}
                        {(hasLiveScore || (p.result || p.status)) && (
                          <div className="flex items-center gap-1">
                            {hasLiveScore && !isFinished && (
                              <span className="text-[9px] font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-1 py-0.5 rounded">
                                {p.homeScore} - {p.awayScore}
                              </span>
                            )}
                            {(p.result || p.status) && (
                              <span className={`text-[7px] font-bold uppercase px-1 rounded ${(p.result || p.status) === 'won' ? 'bg-emerald-100 text-emerald-700' : (p.result || p.status) === 'lost' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                {p.result || p.status}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
                {picks.length > 3 && (
                  <li className="text-[9px] text-[var(--text-muted)] italic">
                    {t('pick_card.more_picks', { n: String(picks.length - 3) })}
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Locked Message for Paid Coupons */}
          {!showFullDetails && (
            <div className="mb-2 flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-md py-2 px-2">
              <div className="text-center">
                <span className="text-lg mb-0.5 block">🔒</span>
                <p className="text-[10px] text-[var(--text-muted)]">{t('pick_card.purchase_to_view')}</p>
              </div>
            </div>
          )}

          {/* Action Button - purchased, viewOnly, or free: View; else purchase */}
          <div className="mt-auto pt-2 border-t border-[var(--border)]/80">
            {showAccessCTA ? (
              <Link
                href={detailsHref ?? `/coupons/${id}`}
                className="block w-full px-3 py-2 rounded-lg font-semibold bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs text-center transition-all duration-200"
              >
                {t('pick_card.view_details')}
              </Link>
            ) : canPurchase ? (
              <button
                type="button"
                onClick={handlePurchase}
                disabled={purchasing}
                className="w-full px-3 py-2 rounded-lg font-semibold bg-[var(--accent)] hover:bg-amber-600 text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {purchasing ? t('pick_card.processing') : t('pick_card.purchase')}
              </button>
            ) : (
              <Link
                href="/wallet"
                className="block w-full px-3 py-1.5 rounded-lg font-semibold bg-amber-500 hover:bg-amber-600 text-white text-xs text-center transition-colors"
              >
                {t('pick_card.top_up_wallet')}
              </Link>
            )}
          </div>
        </div>
      </article>

      {/* Details Modal (Lightbox) */}
      {showDetailsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            className="bg-[var(--card)] rounded-2xl shadow-2xl max-w-2xl w-full min-w-0 max-h-[90vh] overflow-auto border border-[var(--border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-[var(--card)] border-b border-[var(--border)] px-4 sm:px-6 py-4 flex items-center justify-between gap-3 z-10 min-w-0">
              <h3 className="text-base font-semibold text-[var(--text)] min-w-0 flex-1 pr-2">{t('pick_card.coupon_details')}</h3>
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text)] text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              {/* Tipster Info */}
              {tipster && (
                <div className="mb-6 pb-6 border-b border-[var(--border)]">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${tipsterRankBadgeClass(tipster.rank)}`}>
                      {tipsterRankBadgeContent(tipster.rank)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-base text-[var(--text)]">{tipster.displayName}</p>
                        {tipsterShowsAiBadge(tipster) ? <AiTipsterBadge /> : null}
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-[var(--text-muted)]">
                          {t('pick_card.picks_count', { n: String(tipster.totalPicks) })}
                        </span>
                        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          {t('pick_card.win_rate', { rate: (tipster?.winRate != null ? Number(tipster.winRate).toFixed(1) : '—') })}
                        </span>
                        <span className="text-sm text-[var(--text-muted)]">
                          {tipster.wonPicks}W / {tipster.lostPicks}L
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Coupon Info */}
              <div className="mb-6">
                {title ? (
                  <h2 className="text-base font-semibold text-[var(--text)] mb-2">{title}</h2>
                ) : null}
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-sm text-[var(--text-muted)]">
                    {t('pick_card.picks_odds', { n: String(totalPicks), odds: Number(totalOdds).toFixed(2) })}
                  </span>
                  <span className={`text-lg font-bold ${price === 0 ? 'text-emerald-600' : 'text-[var(--primary)]'}`}>
                    {price === 0 ? t('status.free') : (priceDisplay?.primary ?? `GHS ${Number(price).toFixed(2)}`)}
                  </span>
                </div>
              </div>

              {/* All Picks */}
              <div>
                <h4 className="font-semibold text-[var(--text)] mb-3">{t('pick_card.all_selections')}</h4>
                <ul className="space-y-3">
                  {picks.map((p, i) => {
                    const hasScore = p.homeScore != null && p.awayScore != null;
                    const pickResult = p.result || p.status;
                    return (
                      <li key={i} className="flex justify-between items-start gap-2 min-w-0 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <div className="flex-1 pr-2 sm:pr-4 min-w-0">
                          <span className="text-[var(--text)] font-medium flex items-center gap-2 min-w-0">
                            {(p.homeTeamLogo || p.awayTeamLogo || p.homeCountryCode || p.awayCountryCode) && (
                              <span className="flex items-center gap-1 flex-shrink-0">
                                <TeamBadge logo={p.homeTeamLogo} countryCode={p.homeCountryCode} name={p.homeTeamName || undefined} size={20} />
                                <TeamBadge logo={p.awayTeamLogo} countryCode={p.awayCountryCode} name={p.awayTeamName || undefined} size={20} />
                              </span>
                            )}
                            <span className="min-w-0 truncate">{p.matchDescription}</span>
                          </span>
                          {(hasScore || pickResult) && (
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {hasScore && (
                                <span className="text-sm font-bold text-[var(--primary)]">
                                  {p.homeScore} - {p.awayScore}
                                </span>
                              )}
                              {pickResult && (
                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${pickResult === 'won' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : pickResult === 'lost' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-slate-100 text-slate-600'}`}>
                                  {t(`status.${pickResult}`) || pickResult}
                                </span>
                              )}
                              {p.fixtureStatus && (
                                <span className="text-[10px] text-[var(--text-muted)] bg-[var(--border)]/30 px-1.5 py-0.5 rounded">
                                  {p.fixtureStatus}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0 min-w-0">
                          <span className="text-sm text-[var(--text-muted)] block truncate max-w-[8rem] sm:max-w-none">{formatFootballOutcomeLabel(p.prediction)}</span>
                          <span className="text-sm font-semibold text-[var(--primary)] tabular-nums">@{Number(p.odds || 0).toFixed(2)}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Purchase Button in Modal - only when legs are not already visible to this viewer */}
              {!isPurchased && !isFree && !picksRevealed && (
                <div className="mt-6 pt-6 border-t border-[var(--border)]">
                  {canPurchase ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowDetailsModal(false);
                        handlePurchase();
                      }}
                      disabled={purchasing}
                      className="w-full px-6 py-3 rounded-lg font-semibold bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {purchasing ? t('pick_card.processing') : t('pick_card.purchase_for', { price: priceDisplay?.primary ?? `GHS ${Number(price).toFixed(2)}` })}
                    </button>
                  ) : (
                    <Link
                      href="/wallet"
                      className="block w-full px-6 py-3 rounded-lg font-semibold bg-amber-500 hover:bg-amber-600 text-white text-center transition-colors"
                    >
                      {t('pick_card.top_up_wallet_to_purchase')}
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unveil Modal (After Purchase) */}
      {(showUnveilModal || showUnveil) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
          onClick={() => {
            setShowUnveilModal(false);
            if (onUnveilClose) onUnveilClose();
          }}
        >
          <div
            className="bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/20 dark:to-green-900/20 rounded-2xl shadow-2xl max-w-2xl w-full min-w-0 max-h-[90vh] overflow-auto border-2 border-emerald-300 dark:border-emerald-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 sm:px-6 py-4 flex items-center justify-between gap-3 z-10 rounded-t-2xl min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <span className="text-2xl sm:text-3xl shrink-0">🎉</span>
                <h3 className="text-base font-semibold min-w-0">{t('pick_card.coupon_unlocked')}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUnveilModal(false);
                  if (onUnveilClose) onUnveilClose();
                }}
                className="text-white hover:text-gray-200 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              {/* Success Message */}
              <div className="text-center mb-6">
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-2">
                  {t('pick_card.coupon_unlocked_msg')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {price > 0 && (
                    <>{t('pick_card.funds_escrow_note')}</>
                  )}
                </p>
              </div>

              {/* Coupon Details */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6">
                {tipster && (
                  <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${tipsterRankBadgeClass(tipster.rank)}`}>
                        {tipsterRankBadgeContent(tipster.rank)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-[var(--text)]">{tipster.displayName}</p>
                          {tipsterShowsAiBadge(tipster) ? <AiTipsterBadge /> : null}
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">
                          {t('pick_card.win_rate', { rate: (tipster?.winRate != null ? Number(tipster.winRate).toFixed(1) : '—') })} • {t('pick_card.picks_count', { n: String(tipster.totalPicks) })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {title ? (
                  <h2 className="text-base font-semibold text-[var(--text)] mb-3">{title}</h2>
                ) : null}
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-sm text-[var(--text-muted)]">
                    {t('pick_card.picks_odds', { n: String(totalPicks), odds: Number(totalOdds).toFixed(2) })}
                  </span>
                  <span className={`text-lg font-bold ${price === 0 ? 'text-emerald-600' : 'text-[var(--primary)]'}`}>
                    {price === 0 ? t('status.free') : (priceDisplay?.primary ?? `GHS ${Number(price).toFixed(2)}`)}
                  </span>
                </div>

                <div>
                  <h4 className="font-semibold text-[var(--text)] mb-3">{t('pick_card.all_selections')}</h4>
                  <ul className="space-y-2">
                    {picks.map((p, i) => {
                      const hasScore = p.homeScore != null && p.awayScore != null;
                      const pickResult = p.result || p.status;
                      return (
                        <li key={i} className="flex justify-between items-start gap-2 min-w-0 p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                          <div className="flex-1 pr-2 sm:pr-4 min-w-0">
                            <span className="text-sm text-[var(--text)] font-medium flex items-center gap-2 min-w-0">
                              {(p.homeTeamLogo || p.awayTeamLogo || p.homeCountryCode || p.awayCountryCode) && (
                                <span className="flex items-center gap-1 flex-shrink-0">
                                  <TeamBadge logo={p.homeTeamLogo} countryCode={p.homeCountryCode} name={p.homeTeamName || undefined} size={18} />
                                  <TeamBadge logo={p.awayTeamLogo} countryCode={p.awayCountryCode} name={p.awayTeamName || undefined} size={18} />
                                </span>
                              )}
                              <span className="min-w-0 truncate">{p.matchDescription}</span>
                            </span>
                            {(hasScore || pickResult) && (
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {hasScore && (
                                  <span className="text-xs font-bold text-[var(--primary)]">
                                    {p.homeScore} - {p.awayScore}
                                  </span>
                                )}
{pickResult && (
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${pickResult === 'won' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-200' : pickResult === 'lost' ? 'bg-red-500/10 text-red-600 border border-red-200' : 'bg-slate-500/10 text-slate-600'}`}>
                                  {t(`status.${pickResult}`) || pickResult}
                                </span>
                              )}
                                {p.fixtureStatus && (
                                  <span className="text-[9px] text-[var(--text-muted)] bg-[var(--border)]/30 px-1.5 py-0.5 rounded">
                                    {p.fixtureStatus}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0 min-w-0">
                            <span className="text-xs text-[var(--text-muted)] block truncate max-w-[7rem] sm:max-w-none">{formatFootballOutcomeLabel(p.prediction)}</span>
                            <span className="text-xs font-semibold text-[var(--primary)] tabular-nums">@{Number(p.odds || 0).toFixed(2)}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              {/* Escrow Info */}
              {price > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">🔒</span>
                    <div>
                      <p className="font-semibold text-blue-900 dark:text-blue-200 mb-1">{t('pick_card.funds_in_escrow')}</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {t('pick_card.funds_escrow_desc', { amount: Number(price).toFixed(2) })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Link
                  href="/my-purchases"
                  className="flex-1 px-6 py-3 rounded-lg font-semibold bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-center transition-colors"
                >
                  {t('pick_card.view_in_my_purchases')}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setShowUnveilModal(false);
                    if (onUnveilClose) onUnveilClose();
                  }}
                  className="px-6 py-3 rounded-lg font-semibold bg-gray-200 hover:bg-gray-300 text-gray-800 transition-colors"
                >
                  {t('pick_card.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in-out;
        }
      `}</style>
    </>
  );
}
