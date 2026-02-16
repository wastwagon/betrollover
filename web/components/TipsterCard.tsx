'use client';

import { useState } from 'react';
import Link from 'next/link';

export interface TipsterCardData {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_ai?: boolean;
  roi: number;
  win_rate: number;
  current_streak: number;
  total_predictions?: number;
  leaderboard_rank?: number | null;
  is_following?: boolean;
}

interface TipsterCardProps {
  tipster: TipsterCardData;
  onFollow?: () => void;
  className?: string;
}

export function TipsterCard({ tipster, onFollow, className = '' }: TipsterCardProps) {
  const [avatarError, setAvatarError] = useState(false);
  const showAvatar = tipster.avatar_url && !avatarError;
  const roiColor = tipster.roi > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
  const streakDisplay =
    tipster.current_streak > 0
      ? `🔥 ${tipster.current_streak}W`
      : tipster.current_streak < 0
        ? `❄️ ${Math.abs(tipster.current_streak)}L`
        : '—';

  return (
    <article
      className={`card-gradient rounded-2xl shadow-lg overflow-hidden hover:shadow-xl hover:shadow-[var(--primary)]/10 hover:-translate-y-0.5 transition-all duration-300 flex flex-col ${className}`}
    >
      <div className="p-4 flex flex-col flex-1">
        {/* Header - link to profile */}
        <Link href={`/tipsters/${tipster.username}`} className="flex items-center gap-3 mb-3 group">
          <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden bg-[var(--bg)] border border-[var(--border)]">
            {showAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tipster.avatar_url!}
                alt={tipster.display_name}
                className="w-full h-full object-cover"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg font-bold text-[var(--primary)] bg-[var(--primary-light)]">
                {tipster.display_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-[var(--text)] truncate">{tipster.display_name}</h3>
            </div>
            {tipster.leaderboard_rank != null && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Rank #{tipster.leaderboard_rank}</p>
            )}
          </div>
        </Link>

        {/* Bio */}
        {tipster.bio && (
          <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-4">{tipster.bio}</p>
        )}

        {/* Stats */}
        <div className="flex gap-4 mb-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">ROI</span>
            <span className={`text-sm font-bold ${roiColor}`}>
              {Number(tipster.roi).toFixed(2)}%
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Win Rate</span>
            <span className="text-sm font-bold text-[var(--text)]">
              {Number(tipster.win_rate).toFixed(1)}%
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Streak</span>
            <span className="text-sm font-bold text-[var(--text)]">{streakDisplay}</span>
          </div>
        </div>

        {/* Follow Button */}
        {onFollow && (
          <button
            onClick={(e) => { e.preventDefault(); onFollow(); }}
            className={`mt-auto w-full px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
              tipster.is_following
                ? 'bg-[var(--border)] text-[var(--text-muted)] hover:bg-gray-300 dark:hover:bg-gray-600'
                : 'bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white'
            }`}
          >
            {tipster.is_following ? 'Following' : 'Follow'}
          </button>
        )}
      </div>
    </article>
  );
}
