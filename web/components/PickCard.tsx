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
import { formatFootballOutcomeLabel, LEADERBOARD_MIN_SETTLED_FOR_PRIMARY_RANKING } from '@betrollover/shared-types';
import { AiTipsterBadge } from '@/components/AiTipsterBadge';
import { VerifiedTipsterBadge } from '@/components/VerifiedTipsterBadge';
import { KickoffUrgencyLine } from '@/components/KickoffUrgencyLine';
import { FixtureLiveChip } from '@/components/FixtureLiveChip';
import { BookingCodeCopyBlock } from '@/components/BookingCodeCopyBlock';
import { BottomSheet } from '@/components/ios/BottomSheet';
import { PickSocialBar, type PickSocialCounts } from '@/components/pick-social/PickSocialBar';
import { currentLoginRedirectPath } from '@/lib/login-redirect-path';
import { Button, buttonClassName } from '@/components/ui/Button';
import { accaDeskBoardBadge } from '@/lib/acca-desk-board-badge';
import { resultChipClass } from '@/lib/result-chip';

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
  /** Verified account (from API `isVerified` / `is_verified`). */
  isVerified?: boolean;
  is_verified?: boolean;
  /** `acca_desk` vs classic `ai`. */
  tipsterType?: string | null;
  tipster_type?: string | null;
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

function tipsterShowsVerifiedBadge(t: Tipster | null | undefined): boolean {
  if (!t || tipsterShowsAiBadge(t)) return false;
  return t.isVerified === true || t.is_verified === true;
}

const SPORT_META: Record<string, { icon: string; label: string; color: string }> = {
  football:          { icon: '⚽', label: 'Football',          color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  basketball:        { icon: '🏀', label: 'Basketball',        color: 'bg-orange-100 text-orange-800 border-orange-200' },
  rugby:             { icon: '🏉', label: 'Rugby',             color: 'bg-amber-100 text-amber-800 border-amber-200' },
  mma:               { icon: '🥊', label: 'MMA',               color: 'bg-red-100 text-red-800 border-red-200' },
  volleyball:        { icon: '🏐', label: 'Volleyball',        color: 'bg-blue-100 text-blue-800 border-blue-200' },
  hockey:            { icon: '🏒', label: 'Hockey',            color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  american_football: { icon: '🏈', label: 'Amer. Football',   color: 'bg-[var(--primary-light)] text-[var(--primary)] border-[var(--primary)]/25' },
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
  commentCount?: number;
  /** Show like + comment row (marketplace, feeds). */
  socialEnabled?: boolean;
  /** List/detail APIs already included counts — avoids N+1 social-summary calls. */
  socialCountsFromServer?: boolean;
  onSocialCountsChange?: (counts: PickSocialCounts) => void;
  loginRedirectPath?: string;
  onView?: () => void;
  tipster?: Tipster | null;
  isPurchased?: boolean;
  canPurchase?: boolean;
  /** When true, shows View Details only (no purchase). Used for admin marketplace. */
  viewOnly?: boolean;
  /** When set with viewOnly, View Details links to this URL instead of opening modal. */
  detailsHref?: string;
  /** Collapse revealed legs to a few rows with expand (OddsJam-style stay-in-feed). */
  expandableLegs?: boolean;
  collapsedLegCount?: number;
  walletBalance?: number | null;
  onPurchase: () => void;
  purchasing?: boolean;
  showUnveil?: boolean;
  onUnveilClose?: () => void;
  className?: string;
  createdAt?: string;
  /** Buyer review summary for this pick */
  avgRating?: number | null;
  reviewCount?: number | null;
  /** From API: viewer may see full legs (purchase, subscription, free/settled, seller, admin). Drives View vs Purchase CTA when true. */
  picksRevealed?: boolean;
  /** When legs are visible, API may include bookmaker + code (withheld for locked paid picks). */
  bookmakerKey?: string | null;
  bookingCode?: string | null;
  /** Logged-in users who copied booking code (deduped); from API when code is visible */
  bookingCodeCopyCount?: number;
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
  expandableLegs = false,
  collapsedLegCount = 2,
  walletBalance,
  onPurchase,
  purchasing = false,
  showUnveil = false,
  onUnveilClose,
  reactionCount = 0,
  hasReacted = false,
  commentCount = 0,
  socialEnabled = true,
  socialCountsFromServer = false,
  onSocialCountsChange,
  loginRedirectPath: loginRedirectPathProp,
  onView,
  className = '',
  createdAt,
  avgRating,
  reviewCount,
  picksRevealed = false,
  bookmakerKey,
  bookingCode,
  bookingCodeCopyCount = 0,
}: PickCardProps) {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showUnveilModal, setShowUnveilModal] = useState(false);
  const [legsExpanded, setLegsExpanded] = useState(false);
  const [showPurchaseConfirm, setShowPurchaseConfirm] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const t = useT();
  const { format, currency } = useCurrency();
  const loginRedirectPath =
    loginRedirectPathProp ?? (typeof window !== 'undefined' ? currentLoginRedirectPath() : '/login');

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

  const displayStatus = result && ['won', 'lost', 'void'].includes(result) ? result : status;
  const statusColor = displayStatus ? resultChipClass(displayStatus) : '';
  const deskBoard = accaDeskBoardBadge(title, tipster?.tipsterType ?? tipster?.tipster_type, picks);

  const handlePurchase = () => {
    if (price > 0) {
      setShowPurchaseConfirm(true);
      return;
    }
    onPurchase();
  };

  const confirmPurchase = () => {
    setShowPurchaseConfirm(false);
    setShowDetailsModal(false);
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
        className={`card-gradient rounded-[var(--radius)] shadow-card overflow-hidden hover:border-[var(--primary)]/30 transition-colors duration-200 flex flex-col relative border border-[var(--border)] ${className}`}
      >
        {/* Top-right: Acca Desk Today / Tomorrow only (follow lives on tipster cards) */}
        {deskBoard ? (
          <div className="absolute top-1.5 right-1.5 z-10">
            <span
              className={`flex-shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                deskBoard === 'tomorrow'
                  ? 'bg-[var(--accent-light)] text-[var(--accent)]'
                  : 'bg-[var(--primary-light)] text-[var(--primary)]'
              }`}
              title={
                deskBoard === 'tomorrow'
                  ? t('pick_card.desk_tomorrow_title')
                  : t('pick_card.desk_today_title')
              }
            >
              {deskBoard === 'tomorrow' ? t('pick_card.desk_tomorrow') : t('pick_card.desk_today')}
            </span>
          </div>
        ) : null}
        <div className="p-3 flex flex-col flex-1">
          {/* Tipster Performance Header - compact */}
          {(tipster || title) && (
            <div className={`mb-2 pb-2 border-b border-[var(--border)]/80 ${deskBoard ? 'pr-16' : ''}`}>
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
                  <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold ${tipster ? tipsterRankBadgeClass(tipster.rank) : 'bg-[var(--fill-secondary)] text-[var(--text-muted)]'}`}>
                    {tipster ? tipsterRankBadgeContent(tipster.rank) : '?'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="font-medium text-xs text-[var(--text)] truncate min-w-0" title={tipster ? `${t('pick_card.tipster')}: ${tipster.displayName}` : t('pick_card.tipster')}>
                      {tipster?.displayName || t('pick_card.tipster')}
                    </p>
                    {tipsterShowsAiBadge(tipster) ? (
                      <AiTipsterBadge
                        className="!text-[9px] !px-1.5 !py-px"
                        tipsterType={tipster?.tipsterType ?? tipster?.tipster_type}
                      />
                    ) : null}
                    {tipsterShowsVerifiedBadge(tipster) ? (
                      <VerifiedTipsterBadge className="!text-[9px] !px-1.5 !py-px" />
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0">
                    <span className="text-[9px] text-[var(--text-muted)]">
                      {tipster ? `${tipster.totalPicks}p` : `${totalPicks}p`}
                    </span>
                    <span className="text-[9px] font-bold text-[var(--success)]">
                      {tipster?.winRate != null ? `${Number(tipster.winRate).toFixed(1)}%` : '—'}
                    </span>
                    {tipster?.roi != null && (
                      <span
                        className={`text-[9px] font-bold ${
                          Number(tipster.roi) > 0
                            ? 'text-[var(--success)]'
                            : Number(tipster.roi) < 0
                              ? 'text-[var(--destructive)]'
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
                    {tipster &&
                      tipster.wonPicks + tipster.lostPicks > 0 &&
                      tipster.wonPicks + tipster.lostPicks < LEADERBOARD_MIN_SETTLED_FOR_PRIMARY_RANKING && (
                      <span
                        className="text-[9px] font-semibold text-[var(--accent)]"
                        title={t('tipster.early_sample_hint', {
                          n: String(LEADERBOARD_MIN_SETTLED_FOR_PRIMARY_RANKING),
                        })}
                      >
                        {t('tipster.early_sample')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 flex items-center gap-1">
                  {avgRating != null && avgRating > 0 && (
                    <span className="flex items-center gap-0.5">
                      <span className="text-[var(--accent)] text-[10px]">★</span>
                      <span className="text-[9px] font-semibold text-[var(--accent)]">{Number(avgRating).toFixed(1)}</span>
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
            <KickoffUrgencyLine picks={picks} compact className="mt-1" />
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {purchaseActivityLabel && (
                <span
                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                    isFree
                      ? 'bg-[var(--accent-light)] text-[var(--accent)] border-[var(--accent)]/30'
                      : 'bg-[var(--primary-light)] text-[var(--primary)] border-[var(--primary)]/25'
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

          {showFullDetails && bookmakerKey && bookingCode ? (
            <BookingCodeCopyBlock
              couponId={id}
              bookmakerKey={bookmakerKey}
              bookingCode={bookingCode}
              initialCopyCount={bookingCodeCopyCount}
              dense
            />
          ) : null}

          {/* Pick Details - Show for free or purchased picks */}
          {showFullDetails && picks.length > 0 && (
            <div className="mb-2 flex-1">
              <ul className="space-y-1">
                {(expandableLegs && !legsExpanded ? picks.slice(0, collapsedLegCount) : picks.slice(0, expandableLegs ? picks.length : 3)).map((p, i) => {
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
                          isFinished ? (
                            <span className="text-[9px] font-semibold text-[var(--success)] tabular-nums">
                              {hasLiveScore ? `FT ${p.homeScore}-${p.awayScore}` : 'FT'}
                            </span>
                          ) : isLive ? (
                            <FixtureLiveChip
                              label={
                                hasLiveScore
                                  ? `${formatLiveFixturePeriod(p.fixtureStatus, p.fixtureStatusElapsed)} ${p.homeScore}-${p.awayScore}`
                                  : formatLiveFixturePeriod(p.fixtureStatus, p.fixtureStatusElapsed)
                              }
                              className="text-[9px] px-1.5 py-px"
                            />
                          ) : isStarted ? (
                            <span className="text-[9px] font-medium text-[var(--accent)]">
                              {t('kickoff.started_short')}
                            </span>
                          ) : matchDate ? (
                            <span className="text-[9px] text-[var(--text-muted)] tabular-nums">
                              {new Date(matchDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ) : null
                        )}
                        {(hasLiveScore || (p.result || p.status)) && (
                          <div className="flex items-center gap-1">
                            {hasLiveScore && !isFinished && (
                              <span className="text-[9px] font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-1 py-0.5 rounded">
                                {p.homeScore} - {p.awayScore}
                              </span>
                            )}
                            {(p.result || p.status) && (
                              <span className={`text-[7px] font-bold uppercase px-1 rounded ${resultChipClass(p.result || p.status)}`}>
                                {p.result || p.status}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
                {expandableLegs && picks.length > collapsedLegCount ? (
                  <li>
                    <button
                      type="button"
                      onClick={() => setLegsExpanded((v) => !v)}
                      className="touch-target text-[10px] font-semibold text-[var(--primary)] hover:underline py-0.5"
                    >
                      {legsExpanded
                        ? t('pick_card.collapse_legs')
                        : t('pick_card.expand_legs', { n: String(picks.length - collapsedLegCount) })}
                    </button>
                  </li>
                ) : !expandableLegs && picks.length > 3 ? (
                  <li className="text-[9px] text-[var(--text-muted)] italic">
                    {t('pick_card.more_picks', { n: String(picks.length - 3) })}
                  </li>
                ) : null}
              </ul>
            </div>
          )}

          {/* Locked Message for Paid Coupons */}
          {!showFullDetails && (
            <div className="mb-2 flex-1 flex items-center justify-center bg-[var(--fill-secondary)] rounded-md py-2 px-2">
              <div className="text-center">
                <svg
                  className="mx-auto mb-0.5 h-4 w-4 text-[var(--text-muted)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
                <p className="text-[10px] text-[var(--text-muted)]">{t('pick_card.purchase_to_view')}</p>
              </div>
            </div>
          )}

          {socialEnabled && (
            <PickSocialBar
              pickId={id}
              reactionCount={reactionCount}
              hasReacted={hasReacted}
              commentCount={commentCount}
              socialCountsFromServer={socialCountsFromServer}
              enabled
              loginRedirectPath={loginRedirectPath}
              onCountsChange={onSocialCountsChange}
            />
          )}

          {/* Action Button - purchased, viewOnly, or free: View; else purchase */}
          <div className="mt-auto pt-2 border-t border-[var(--border)]/80">
            {showAccessCTA ? (
              <Link
                href={detailsHref ?? `/coupons/${id}`}
                className={buttonClassName({ variant: 'primary', size: 'sm', fullWidth: true, className: 'text-xs' })}
              >
                {t('pick_card.view_details')}
              </Link>
            ) : canPurchase ? (
              <Button
                type="button"
                variant="accent"
                size="sm"
                fullWidth
                onClick={handlePurchase}
                disabled={purchasing}
                className="text-xs"
              >
                {purchasing ? t('pick_card.processing') : t('pick_card.purchase')}
              </Button>
            ) : (
              <Link
                href="/wallet"
                className={buttonClassName({ variant: 'accent', size: 'sm', fullWidth: true, className: 'text-xs py-1.5 min-h-0' })}
              >
                {t('pick_card.top_up_wallet')}
              </Link>
            )}
          </div>
        </div>
      </article>

      <BottomSheet
        open={showPurchaseConfirm}
        onClose={() => setShowPurchaseConfirm(false)}
        title={t('pick_card.confirm_purchase_title')}
        doneLabel={t('common.cancel')}
        maxHeightClass="max-h-[min(70dvh,480px)]"
      >
        <div className="p-4 sm:p-5 space-y-4">
          <p className="text-sm text-[var(--text)] leading-relaxed">{t('pick_card.confirm_purchase_body')}</p>
          <div className="rounded-xl border border-[var(--primary)]/25 bg-[var(--primary-light)] px-4 py-3">
            <p className="text-xs font-bold text-[var(--primary)] mb-1">
              {t('pick_detail.escrow_badge_title')}
            </p>
            <p className="text-xs text-[var(--text)] leading-relaxed">
              {t('pick_card.funds_escrow_note')}
            </p>
            {priceDisplay?.original ? (
              <p className="text-[11px] text-[var(--text-muted)] mt-1.5 tabular-nums">
                {priceDisplay.primary} · {priceDisplay.original}
              </p>
            ) : (
              <p className="text-[11px] text-[var(--text-muted)] mt-1.5 tabular-nums">
                {priceDisplay?.primary ?? `GHS ${Number(price).toFixed(2)}`}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="primary"
            fullWidth
            onClick={confirmPurchase}
            disabled={purchasing}
            className="touch-target min-h-[48px] rounded-xl"
          >
            {purchasing
              ? t('pick_card.processing')
              : t('pick_card.confirm_purchase_cta', {
                  price: priceDisplay?.primary ?? `GHS ${Number(price).toFixed(2)}`,
                })}
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet
        open={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title={t('pick_card.pick_details')}
        maxHeightClass="max-h-[min(92dvh,800px)]"
      >
            <div className="p-4 sm:p-6">
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
                        {tipsterShowsAiBadge(tipster) ? (
                          <AiTipsterBadge tipsterType={tipster?.tipsterType ?? tipster?.tipster_type} />
                        ) : null}
                        {deskBoard ? (
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              deskBoard === 'tomorrow'
                                ? 'bg-[var(--accent-light)] text-[var(--accent)]'
                                : 'bg-[var(--primary-light)] text-[var(--primary)]'
                            }`}
                          >
                            {deskBoard === 'tomorrow' ? t('pick_card.desk_tomorrow') : t('pick_card.desk_today')}
                          </span>
                        ) : null}
                        {tipsterShowsVerifiedBadge(tipster) ? <VerifiedTipsterBadge /> : null}
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-[var(--text-muted)]">
                          {t('pick_card.picks_count', { n: String(tipster.totalPicks) })}
                        </span>
                        <span className="text-sm font-medium text-[var(--success)]">
                          {t('pick_card.win_rate', { rate: (tipster?.winRate != null ? Number(tipster.winRate).toFixed(1) : '—') })}
                        </span>
                        <span className="text-sm text-[var(--text-muted)]">
                          {tipster.wonPicks}W / {tipster.lostPicks}L
                        </span>
                        {tipster.wonPicks + tipster.lostPicks > 0 &&
                          tipster.wonPicks + tipster.lostPicks < LEADERBOARD_MIN_SETTLED_FOR_PRIMARY_RANKING && (
                          <span
                            className="text-sm font-semibold text-[var(--accent)]"
                            title={t('tipster.early_sample_hint', {
                              n: String(LEADERBOARD_MIN_SETTLED_FOR_PRIMARY_RANKING),
                            })}
                          >
                            {t('tipster.early_sample')}
                          </span>
                        )}
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
                  <span className={`text-lg font-bold ${price === 0 ? 'text-[var(--success)]' : 'text-[var(--primary)]'}`}>
                    {price === 0 ? t('status.free') : (priceDisplay?.primary ?? `GHS ${Number(price).toFixed(2)}`)}
                  </span>
                </div>
                {bookmakerKey && bookingCode ? (
                  <BookingCodeCopyBlock
                    couponId={id}
                    bookmakerKey={bookmakerKey}
                    bookingCode={bookingCode}
                    initialCopyCount={bookingCodeCopyCount}
                  />
                ) : null}
              </div>

              {/* All Picks */}
              <div>
                <h4 className="font-semibold text-[var(--text)] mb-3">{t('pick_card.all_selections')}</h4>
                <ul className="space-y-3">
                  {picks.map((p, i) => {
                    const hasScore = p.homeScore != null && p.awayScore != null;
                    const pickResult = p.result || p.status;
                    return (
                      <li key={i} className="flex justify-between items-start gap-2 min-w-0 p-3 bg-[var(--fill-secondary)] rounded-lg">
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
                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${resultChipClass(pickResult)}`}>
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
                    <Button
                      type="button"
                      variant="primary"
                      fullWidth
                      onClick={() => {
                        setShowDetailsModal(false);
                        handlePurchase();
                      }}
                      disabled={purchasing}
                      className="px-6 py-3"
                    >
                      {purchasing ? t('pick_card.processing') : t('pick_card.purchase_for', { price: priceDisplay?.primary ?? `GHS ${Number(price).toFixed(2)}` })}
                    </Button>
                  ) : (
                    <Link
                      href="/wallet"
                      className={buttonClassName({ variant: 'accent', fullWidth: true, className: 'px-6 py-3' })}
                    >
                      {t('pick_card.top_up_wallet_to_purchase')}
                    </Link>
                  )}
                </div>
              )}
            </div>
      </BottomSheet>

      <BottomSheet
        open={showUnveilModal || showUnveil}
        onClose={() => {
          setShowUnveilModal(false);
          if (onUnveilClose) onUnveilClose();
        }}
        title={t('pick_card.pick_unlocked')}
        maxHeightClass="max-h-[min(92dvh,800px)]"
      >
            <div className="p-4 sm:p-6">
              {/* Success Message */}
              <div className="text-center mb-6">
                <p className="text-base text-[var(--text)] mb-2">
                  {t('pick_card.pick_unlocked_msg')}
                </p>
                {price > 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">
                    {t('pick_card.funds_escrow_note')}
                  </p>
                ) : null}
              </div>

              {/* Coupon Details */}
              <div className="ios-grouped-section p-4 sm:p-5 mb-6">
                {tipster && (
                  <div className="mb-4 pb-4 border-b border-[var(--separator)]">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${tipsterRankBadgeClass(tipster.rank)}`}>
                        {tipsterRankBadgeContent(tipster.rank)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-[var(--text)]">{tipster.displayName}</p>
                          {tipsterShowsAiBadge(tipster) ? (
                            <AiTipsterBadge tipsterType={tipster?.tipsterType ?? tipster?.tipster_type} />
                          ) : null}
                          {deskBoard ? (
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                deskBoard === 'tomorrow'
                                  ? 'bg-[var(--accent-light)] text-[var(--accent)]'
                                  : 'bg-[var(--primary-light)] text-[var(--primary)]'
                              }`}
                            >
                              {deskBoard === 'tomorrow' ? t('pick_card.desk_tomorrow') : t('pick_card.desk_today')}
                            </span>
                          ) : null}
                          {tipsterShowsVerifiedBadge(tipster) ? <VerifiedTipsterBadge /> : null}
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
                  <span className={`text-lg font-bold ${price === 0 ? 'text-[var(--success)]' : 'text-[var(--primary)]'}`}>
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
                        <li key={i} className="flex justify-between items-start gap-2 min-w-0 p-2 bg-[var(--fill-secondary)] rounded-lg">
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
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${resultChipClass(pickResult)}`}>
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

              {price > 0 && (
                <div className="bg-[var(--fill-secondary)] border border-[var(--separator)] rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-semibold text-[var(--primary)]">Escrow</span>
                    <div>
                      <p className="font-semibold text-[var(--text)] mb-1">{t('pick_card.funds_in_escrow')}</p>
                      <p className="text-sm text-[var(--text-muted)]">
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
                  className={buttonClassName({ variant: 'primary', className: 'flex-1 px-6 py-3' })}
                >
                  {t('pick_card.view_in_my_purchases')}
                </Link>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowUnveilModal(false);
                    if (onUnveilClose) onUnveilClose();
                  }}
                  className="px-6 py-3 rounded-xl"
                >
                  {t('pick_card.close')}
                </Button>
              </div>
            </div>
      </BottomSheet>

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
