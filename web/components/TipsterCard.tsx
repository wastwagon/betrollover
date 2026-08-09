'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getAvatarUrl, shouldUnoptimizeGoogleAvatar } from '@/lib/site-config';
import { useT } from '@/context/LanguageContext';
import { FollowersCountButton } from '@/components/TipsterFollowersModal';
import { AiTipsterBadge } from '@/components/AiTipsterBadge';
import { TipsterTrustStrip } from '@/components/TipsterTrustStrip';

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
  avg_rating?: number | null;
  review_count?: number | null;
  avg_odds?: number | null;
}

interface TipsterCardProps {
  tipster: TipsterCardData;
  onFollow?: () => void;
  followLoading?: boolean;
  className?: string;
}

/**
 * Tipstrr-inspired quiet tipster card: one hero metric, light borders, no gradient chrome.
 */
export function TipsterCard({ tipster, onFollow, followLoading = false, className = '' }: TipsterCardProps) {
  const t = useT();
  const [avatarError, setAvatarError] = useState(false);
  const showAvatar = tipster.avatar_url && !avatarError;
  const settledCount = (tipster.total_wins ?? 0) + (tipster.total_losses ?? 0);
  const hasSettledPicks = settledCount > 0;
  const roiDisplay = hasSettledPicks ? `${Number(tipster.roi).toFixed(1)}%` : '—';
  const winRateDisplay = hasSettledPicks ? `${Number(tipster.win_rate).toFixed(0)}%` : '—';
  const roiPositive = tipster.roi > 0;
  const roiNegative = tipster.roi < 0;

  return (
    <article
      className={`rounded-[var(--radius-ios-group)] bg-[var(--card)] border border-[var(--separator)] overflow-hidden flex flex-col w-full min-w-0 max-w-full ${className}`}
    >
      <div className="p-4 flex flex-col flex-1 min-w-0">
        <div className="flex items-start gap-3 mb-3 min-w-0">
          <Link href={`/tipsters/${tipster.username}`} className="shrink-0 touch-target">
            <div className="w-11 h-11 rounded-full overflow-hidden bg-[var(--fill-secondary)] border border-[var(--separator)]">
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
                <h3 className="font-semibold text-[15px] text-[var(--text)] truncate min-w-0">
                  {tipster.display_name}
                </h3>
                {tipster.is_ai ? <AiTipsterBadge /> : null}
              </span>
            </Link>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5 text-xs text-[var(--text-muted)]">
              {tipster.leaderboard_rank != null && (
                <span>
                  {t('tipster.rank_prefix')}
                  {tipster.leaderboard_rank}
                </span>
              )}
              <FollowersCountButton
                count={tipster.follower_count ?? 0}
                tipsterUsername={tipster.username}
                tipsterDisplayName={tipster.display_name}
              />
            </div>
          </div>
        </div>

        {/* Hero metric — Tipstrr-style primary number */}
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

        <dl className="grid grid-cols-2 gap-px rounded-lg overflow-hidden border border-[var(--separator)] bg-[var(--separator)] mb-3">
          <div className="bg-[var(--card)] px-3 py-2.5 text-center">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              {t('tipster.win_rate')}
            </dt>
            <dd className="text-sm font-bold text-[var(--text)] tabular-nums mt-0.5">{winRateDisplay}</dd>
          </div>
          <div className="bg-[var(--card)] px-3 py-2.5 text-center">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              {t('tipster.total_picks')}
            </dt>
            <dd className="text-sm font-bold text-[var(--text)] tabular-nums mt-0.5">
              {tipster.total_predictions ?? 0}
            </dd>
          </div>
        </dl>

        <TipsterTrustStrip
          className="mb-3"
          compact
          settledCount={settledCount}
          avgOdds={tipster.avg_odds}
          avgRating={tipster.avg_rating}
          reviewCount={tipster.review_count}
        />

        {tipster.bio ? (
          <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-3">{tipster.bio}</p>
        ) : null}

        <div className="mt-auto flex flex-col gap-2">
          {tipster.vip_package_id != null && tipster.vip_package_id > 0 && (
            <Link
              href={`/subscriptions/checkout?packageId=${tipster.vip_package_id}`}
              className="touch-target w-full text-center px-3 py-2.5 rounded-xl font-semibold text-sm bg-[var(--accent-light)] text-[var(--text)] border border-[var(--separator)] hover:opacity-90 transition-opacity"
            >
              {t('tipster.join_vip')}
            </Link>
          )}
          {onFollow && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onFollow();
              }}
              disabled={followLoading}
              className={`touch-target w-full px-3 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-70 ${
                tipster.is_following
                  ? 'bg-[var(--fill-secondary)] text-[var(--text-muted)]'
                  : 'bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white'
              }`}
            >
              {followLoading ? '...' : tipster.is_following ? t('tipster.following') : t('tipster.follow')}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
