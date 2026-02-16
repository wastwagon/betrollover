'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export interface PredictionFixture {
  id?: number;
  home_team: string;
  away_team: string;
  selected_outcome: string;
  selection_odds: number;
  match_date?: string;
  league_name?: string | null;
  result_status?: string;
}

function formatKickoff(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export interface PredictionCardData {
  id: number;
  prediction_title: string | null;
  combined_odds: number;
  stake_units?: number;
  confidence_level?: string | null;
  status?: string;
  username?: string;
  display_name?: string;
  avatar_url?: string | null;
  roi?: number;
  win_rate?: number;
  posted_at?: string;
  fixtures: PredictionFixture[];
}

function formatPostedAt(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

interface PredictionCardProps {
  prediction: PredictionCardData;
  onCopyBet?: () => void;
  className?: string;
  linkToDetail?: boolean;
}

function formatOutcome(outcome: string): string {
  const o = (outcome || '').toLowerCase();
  if (o === 'home') return 'Home Win';
  if (o === 'away') return 'Away Win';
  if (o === 'draw') return 'Draw';
  if (o === 'btts') return 'BTTS Yes';
  if (o === 'over25') return 'Over 2.5';
  if (o === 'under25') return 'Under 2.5';
  if (o === 'home_away') return 'Home or Away (12)';
  return outcome || '—';
}

export function PredictionCard({ prediction, onCopyBet, className = '', linkToDetail = true }: PredictionCardProps) {
  const router = useRouter();
  const [avatarError, setAvatarError] = useState(false);
  const showAvatar = prediction.avatar_url && !avatarError;
  const tipsterName = prediction.display_name || prediction.username || 'Tipster';
  const confidenceClass =
    prediction.confidence_level === 'max'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
      : prediction.confidence_level === 'high'
        ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
        : prediction.confidence_level === 'medium'
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
          : 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300';

  const cardContent = (
    <div className="p-4 flex flex-col flex-1">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--border)]">
        <Link
          href={prediction.username ? `/tipsters/${prediction.username}` : '#'}
          className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-[var(--bg)] border border-[var(--border)] block"
          onClick={(e) => e.stopPropagation()}
        >
            {showAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={prediction.avatar_url!}
                alt={tipsterName}
                className="w-full h-full object-cover"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-bold text-[var(--primary)] bg-[var(--primary-light)]">
                {tipsterName.charAt(0).toUpperCase()}
              </div>
            )}
        </Link>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-[var(--text)] truncate">
            {prediction.username ? (
              <Link href={`/tipsters/${prediction.username}`} className="hover:text-[var(--primary)]" onClick={(e) => e.stopPropagation()}>
                {tipsterName}
              </Link>
            ) : (
              tipsterName
            )}
          </p>
            {(prediction.roi != null || prediction.win_rate != null) && (
              <p className="text-xs text-[var(--text-muted)]">
                {prediction.roi != null && `${Number(prediction.roi).toFixed(1)}% ROI`}
                {prediction.roi != null && prediction.win_rate != null && ' • '}
                {prediction.win_rate != null && `${Number(prediction.win_rate).toFixed(1)}% win rate`}
              </p>
            )}
          </div>
          {prediction.confidence_level && (
            <span
              className={`flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-medium capitalize ${confidenceClass}`}
            >
              {prediction.confidence_level}
            </span>
          )}
      </div>

      {prediction.posted_at && (
        <p className="text-[10px] text-[var(--text-muted)] mb-3">
          Posted {formatPostedAt(prediction.posted_at)}
        </p>
      )}

      {/* Fixtures */}
        <div className="space-y-3 mb-4">
          {prediction.fixtures.map((fixture, idx) => (
            <div
              key={idx}
              className="flex flex-col gap-1 p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]"
            >
              <span className="text-sm font-medium text-[var(--text)]">
                {fixture.home_team} vs {fixture.away_team}
              </span>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--primary)] font-semibold">
                  {formatOutcome(fixture.selected_outcome)}
                </span>
                <span className="text-[var(--text-muted)]">@{Number(fixture.selection_odds).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                {fixture.league_name && (
                  <span className="text-[10px] text-[var(--text-muted)]">{fixture.league_name}</span>
                )}
                {fixture.match_date && (
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">
                    {formatKickoff(fixture.match_date)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

      {/* Footer */}
      <div className="mt-auto pt-3 border-t border-[var(--border)] flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-[var(--text)]">
          Total Odds: {Number(prediction.combined_odds).toFixed(2)}
        </span>
        {onCopyBet && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCopyBet(); }}
            className="px-4 py-2 rounded-xl font-semibold text-sm bg-[var(--accent)] hover:bg-amber-600 text-white transition-colors"
            type="button"
          >
            Copy Bet
          </button>
        )}
      </div>
    </div>
  );

  const articleClass = `card-gradient rounded-2xl shadow-lg overflow-hidden hover:shadow-xl hover:shadow-[var(--primary)]/10 hover:-translate-y-0.5 transition-all duration-300 flex flex-col cursor-pointer ${className}`;

  return (
    <article
      className={articleClass}
      onClick={linkToDetail ? () => router.push(`/predictions/${prediction.id}`) : undefined}
      role={linkToDetail ? 'button' : undefined}
    >
      {cardContent}
    </article>
  );
}
