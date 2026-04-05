'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getAvatarUrl, shouldUnoptimizeGoogleAvatar } from '@/lib/site-config';
import { useT } from '@/context/LanguageContext';
import { FollowersCountButton } from '@/components/TipsterFollowersModal';

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
}

interface TipsterCardProps {
  tipster: TipsterCardData;
  onFollow?: () => void;
  followLoading?: boolean;
  className?: string;
}

export function TipsterCard({ tipster, onFollow, followLoading = false, className = '' }: TipsterCardProps) {
  const t = useT();
  const [avatarError, setAvatarError] = useState(false);
  const showAvatar = tipster.avatar_url && !avatarError;
  const hasSettledPicks = ((tipster.total_wins ?? 0) + (tipster.total_losses ?? 0)) > 0;
  const roiDisplay = hasSettledPicks ? `${Number(tipster.roi).toFixed(2)}%` : '—';
  const winRateDisplay = hasSettledPicks ? `${Number(tipster.win_rate).toFixed(1)}%` : '—';
  const roiColor = tipster.roi > 0 ? 'text-emerald-600 dark:text-emerald-400' : tipster.roi < 0 ? 'text-red-600 dark:text-red-400' : 'text-[var(--text)]';

  return (
    <article
      className={`card-gradient rounded-2xl shadow-lg overflow-hidden hover:shadow-xl hover:shadow-[var(--primary)]/10 hover:-translate-y-0.5 transition-all duration-300 flex flex-col w-full min-w-0 max-w-full ${className}`}
    >
      <div className="p-3 sm:p-4 flex flex-col flex-1 min-w-0">
        {/* Header — avatar + name link; follower count is separate (opens list) */}
        <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3 min-w-0">
          <Link href={`/tipsters/${tipster.username}`} className="shrink-0 group">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-[var(--bg)] border border-[var(--border)]">
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
                <div className="w-full h-full flex items-center justify-center text-sm sm:text-lg font-bold text-[var(--primary)] bg-[var(--primary-light)]">
                  {tipster.display_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/tipsters/${tipster.username}`} className="block group">
              <h3 className="font-semibold text-sm sm:text-base text-[var(--text)] truncate">{tipster.display_name}</h3>
            </Link>
            <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1 mt-0.5 text-[10px] sm:text-xs text-[var(--text-muted)]">
              {tipster.leaderboard_rank != null && (
                <span>{t('tipster.rank_prefix')}{tipster.leaderboard_rank}</span>
              )}
              <FollowersCountButton
                count={tipster.follower_count ?? 0}
                tipsterUsername={tipster.username}
                tipsterDisplayName={tipster.display_name}
              />
            </div>
          </div>
        </div>

        {/* Bio */}
        {tipster.bio && (
          <p className="text-xs sm:text-sm text-[var(--text-muted)] line-clamp-2 mb-2 sm:mb-4">{tipster.bio}</p>
        )}

        {/* Stats */}
        <div className="flex flex-wrap gap-3 sm:gap-4 mb-2 sm:mb-4 min-w-0">
          <div className="flex flex-col">
            <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{t('tipster.roi')}</span>
            <span className={`text-xs sm:text-sm font-bold ${roiColor}`}>{roiDisplay}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{t('tipster.win_rate')}</span>
            <span className="text-xs sm:text-sm font-bold text-[var(--text)]">{winRateDisplay}</span>
          </div>
        </div>

        {/* Follow + Join VIP */}
        <div className="mt-auto flex flex-col gap-2">
          {tipster.vip_package_id != null && tipster.vip_package_id > 0 && (
            <Link
              href={`/subscriptions/checkout?packageId=${tipster.vip_package_id}`}
              className="w-full text-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-400/40 hover:bg-amber-500/25 transition-colors"
            >
              Join VIP
            </Link>
          )}
          {onFollow && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); onFollow(); }}
              disabled={followLoading}
              className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-colors disabled:opacity-70 ${
                tipster.is_following
                  ? 'bg-[var(--border)] text-[var(--text-muted)] hover:bg-gray-300 dark:hover:bg-gray-600'
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
