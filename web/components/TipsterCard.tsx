'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getAvatarUrl, shouldUnoptimizeGoogleAvatar } from '@/lib/site-config';
import { useT } from '@/context/LanguageContext';
import { FollowersCountButton } from '@/components/TipsterFollowersModal';
import { VerifiedTipsterBadge } from '@/components/VerifiedTipsterBadge';
import { TipsterTrustStrip } from '@/components/TipsterTrustStrip';
import { isSubscriptionsEnabled } from '@/lib/subscriptions-enabled';
import { TIPSTER_ACTIVE_WITHIN_DAYS, TIPSTER_FORM_POST_CAP } from '@betrollover/shared-types';
import { Button } from '@/components/ui/Button';

export interface TipsterCardData {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  roi: number;
  win_rate: number;
  current_streak: number;
  total_predictions?: number;
  total_wins?: number;
  total_losses?: number;
  leaderboard_rank?: number | null;
  follower_count?: number;
  is_following?: boolean;
  /** Active VIP subscription package id from API; omit or null if none. */
  vip_package_id?: number | null;
  /** Platform-operated AI tipster (from API `is_ai`). */
  is_ai?: boolean;
  is_verified?: boolean;
  tipster_type?: string | null;
  avg_rating?: number | null;
  review_count?: number | null;
  avg_odds?: number | null;
  form_points?: number | null;
}

interface TipsterCardProps {
  tipster: TipsterCardData;
  onFollow?: () => void;
  followLoading?: boolean;
  className?: string;
  /** Home discovery cards — denser, elevated surface. */
  variant?: 'default' | 'premium';
  compareSelected?: boolean;
  onCompareToggle?: () => void;
  compareDisabled?: boolean;
}

/**
 * Tipstrr-inspired quiet tipster card: one hero metric, light borders, no gradient chrome.
 */
export function TipsterCard({
  tipster,
  onFollow,
  followLoading = false,
  className = '',
  variant = 'default',
  compareSelected = false,
  onCompareToggle,
  compareDisabled = false,
}: TipsterCardProps) {
  const t = useT();
  const [avatarError, setAvatarError] = useState(false);
  const showAvatar = tipster.avatar_url && !avatarError;
  const settledCount = (tipster.total_wins ?? 0) + (tipster.total_losses ?? 0);
  const hasSettledPicks = settledCount > 0;
  const roiDisplay = hasSettledPicks ? `${Number(tipster.roi).toFixed(1)}%` : '—';
  const winRateDisplay = hasSettledPicks ? `${Number(tipster.win_rate).toFixed(0)}%` : '—';
  const roiPositive = tipster.roi > 0;
  const roiNegative = tipster.roi < 0;
  const premium = variant === 'premium';

  return (
    <article
      className={`overflow-hidden flex flex-col w-full min-w-0 max-w-full transition-all duration-200 ease-out ${
        premium
          ? 'rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-md hover:shadow-lg'
          : 'rounded-[var(--radius-ios-group)] bg-[var(--card)] border border-[var(--separator)]'
      } ${className}`}
    >
      <div className={`flex flex-col flex-1 min-w-0 ${premium ? 'p-3' : 'p-4'}`}>
        <div className={`flex items-start min-w-0 ${premium ? 'mb-2 gap-2' : 'mb-3 gap-3'}`}>
          <Link href={`/tipsters/${tipster.username}`} className="shrink-0 touch-target">
            <div
              className={`rounded-full overflow-hidden bg-[var(--fill-secondary)] border ${
                premium
                  ? 'h-7 w-7 border-[var(--border)]'
                  : 'w-11 h-11 border-[var(--separator)]'
              }`}
            >
              {showAvatar ? (
                <Image
                  src={getAvatarUrl(tipster.avatar_url!, 48)!}
                  alt={tipster.display_name}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                  unoptimized={shouldUnoptimizeGoogleAvatar(getAvatarUrl(tipster.avatar_url!, 48))}
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-[var(--primary)] bg-[var(--primary-light)]">
                  {tipster.display_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/tipsters/${tipster.username}`} className="block group min-w-0">
              <span className="flex items-center gap-2 min-w-0">
                <h3
                  className={`font-semibold text-[var(--text)] truncate min-w-0 ${
                    premium ? 'text-xs tracking-tight' : 'text-[15px]'
                  }`}
                >
                  {tipster.display_name}
                </h3>
                {!premium && !tipster.is_ai && tipster.is_verified ? (
                  <VerifiedTipsterBadge />
                ) : null}
              </span>
            </Link>
            <div
              className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 ${
                premium ? 'text-[9px] text-[var(--text-muted)]' : 'text-xs text-[var(--text-muted)]'
              }`}
            >
              {tipster.leaderboard_rank != null && (
                <span
                  className={
                    premium
                      ? 'font-semibold text-[var(--success)]'
                      : undefined
                  }
                >
                  {t('tipster.rank_prefix')}
                  {tipster.leaderboard_rank}
                </span>
              )}
              {!premium ? (
                <FollowersCountButton
                  count={tipster.follower_count ?? 0}
                  tipsterUsername={tipster.username}
                  tipsterDisplayName={tipster.display_name}
                />
              ) : null}
            </div>
          </div>
        </div>

        {/* Metric grid — 2×2 on premium so ROI/Form never collide in a 2-col home shelf. */}
        {premium ? (
          <div className="mb-2 grid grid-cols-2 gap-x-3 gap-y-3 rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/5 px-2.5 py-2.5 min-w-0">
            <div className="min-w-0 overflow-hidden">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--text-muted)] truncate">
                {t('tipster.roi')}
              </p>
              <p
                className={`text-sm font-bold tabular-nums leading-tight mt-0.5 truncate ${
                  roiPositive
                    ? 'text-[var(--success)]'
                    : roiNegative
                      ? 'text-[var(--destructive)]'
                      : 'text-[var(--text)]'
                }`}
              >
                {roiDisplay}
              </p>
            </div>
            <div
              className="min-w-0 overflow-hidden"
              title={t('leaderboard.form_hint', { days: String(TIPSTER_ACTIVE_WITHIN_DAYS), cap: String(TIPSTER_FORM_POST_CAP) })}
            >
              <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--text-muted)] truncate">
                {t('leaderboard.form_col')}
              </p>
              <p className="text-sm font-bold text-[var(--text)] tabular-nums leading-tight mt-0.5 truncate">
                {tipster.form_points != null && tipster.form_points > 0 ? tipster.form_points : '—'}
              </p>
            </div>
            <div className="min-w-0 overflow-hidden">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--text-muted)] truncate">
                {t('tipster.win_rate_short')}
              </p>
              <p className="text-sm font-bold text-[var(--text)] tabular-nums leading-tight mt-0.5 truncate">
                {winRateDisplay}
              </p>
            </div>
            <div className="min-w-0 overflow-hidden">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--text-muted)] truncate">
                {t('tipster.total_picks_short')}
              </p>
              <p className="text-sm font-bold text-[var(--text)] tabular-nums leading-tight mt-0.5 truncate">
                {tipster.total_predictions ?? 0}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="border-t border-[var(--separator)] pt-3 mb-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)] mb-0.5">
                {t('tipster.roi')}
              </p>
              <p
                className={`text-[28px] font-bold tracking-tight tabular-nums leading-none ${
                  roiPositive
                    ? 'text-[var(--primary)]'
                    : roiNegative
                      ? 'text-[var(--destructive)]'
                      : 'text-[var(--text)]'
                }`}
              >
                {roiDisplay}
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-px rounded-lg overflow-hidden border border-[var(--separator)] bg-[var(--separator)] mb-3">
              <div className="bg-[var(--card)] px-1.5 sm:px-2 py-2.5 text-center min-w-0 overflow-hidden">
                <dt
                  className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)] truncate"
                  title={t('leaderboard.form_hint', {
                    days: String(TIPSTER_ACTIVE_WITHIN_DAYS),
                    cap: String(TIPSTER_FORM_POST_CAP),
                  })}
                >
                  {t('leaderboard.form_col')}
                </dt>
                <dd className="text-sm font-bold text-[var(--text)] tabular-nums mt-0.5 truncate">
                  {tipster.form_points != null && tipster.form_points > 0 ? tipster.form_points : '—'}
                </dd>
              </div>
              <div className="bg-[var(--card)] px-1.5 sm:px-2 py-2.5 text-center min-w-0 overflow-hidden">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)] truncate">
                  {t('tipster.win_rate_short')}
                </dt>
                <dd className="text-sm font-bold text-[var(--text)] tabular-nums mt-0.5 truncate">{winRateDisplay}</dd>
              </div>
              <div className="bg-[var(--card)] px-1.5 sm:px-2 py-2.5 text-center min-w-0 overflow-hidden">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)] truncate">
                  {t('tipster.total_picks_short')}
                </dt>
                <dd className="text-sm font-bold text-[var(--text)] tabular-nums mt-0.5 truncate">
                  {tipster.total_predictions ?? 0}
                </dd>
              </div>
            </dl>
          </>
        )}

        {!premium ? (
          <TipsterTrustStrip
            className="mb-3"
            compact
            settledCount={settledCount}
            avgOdds={tipster.avg_odds}
            avgRating={tipster.avg_rating}
            reviewCount={tipster.review_count}
          />
        ) : null}

        {tipster.bio ? (
          <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-3">{tipster.bio}</p>
        ) : null}

        <div className="mt-auto flex flex-col gap-2">
          {onCompareToggle && !premium ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onCompareToggle();
              }}
              disabled={compareDisabled && !compareSelected}
              className={`touch-target w-full px-3 py-2 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-50 ${
                compareSelected
                  ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                  : 'border-[var(--separator)] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
              }`}
            >
              {compareSelected ? t('tipster.compare_selected') : t('tipster.compare_add')}
            </button>
          ) : null}
          {isSubscriptionsEnabled() && tipster.vip_package_id != null && tipster.vip_package_id > 0 && (
            <Link
              href={`/subscriptions/checkout?packageId=${tipster.vip_package_id}`}
              className="touch-target w-full text-center px-3 py-2.5 rounded-xl font-semibold text-sm bg-[var(--accent-light)] text-[var(--text)] border border-[var(--separator)] hover:opacity-90 transition-opacity"
            >
              {t('tipster.join_vip')}
            </Link>
          )}
          {onFollow && (
            <Button
              type="button"
              variant={tipster.is_following ? 'secondary' : 'primary'}
              fullWidth
              onClick={(e) => {
                e.preventDefault();
                onFollow();
              }}
              disabled={followLoading}
              className="touch-target"
            >
              {followLoading ? '...' : tipster.is_following ? t('tipster.following') : t('tipster.follow')}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
