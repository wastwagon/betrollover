'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { getApiUrl, getAvatarUrl, shouldUnoptimizeGoogleAvatar } from '@/lib/site-config';
import { useT } from '@/context/LanguageContext';

export interface TipsterFollowerRow {
  user_id: number;
  display_name: string;
  username: string;
  avatar_url: string | null;
  tipster_username: string | null;
  tipster_id: number | null;
  you_follow_them: boolean;
  is_self: boolean;
  followed_at: string;
}

interface TipsterFollowersModalProps {
  open: boolean;
  onClose: () => void;
  /** Tipster whose followers are listed (URL slug, e.g. TheGambler). */
  tipsterUsername: string;
  /** Shown in header */
  tipsterDisplayName?: string;
  /** Called after follow/unfollow so parent can refresh counts */
  onFollowersMutate?: () => void;
}

export function TipsterFollowersModal({
  open,
  onClose,
  tipsterUsername,
  tipsterDisplayName,
  onFollowersMutate,
}: TipsterFollowersModalProps) {
  const t = useT();
  const [mounted, setMounted] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [followers, setFollowers] = useState<TipsterFollowerRow[]>([]);
  const [actionUserId, setActionUserId] = useState<number | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setFeedback(null);
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = null;
      }
    }
  }, [open]);

  /** Lock page scroll when open; pad body by scrollbar width to avoid horizontal layout jump (common flicker). */
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPaddingRight = body.style.paddingRight;
    const gap = window.innerWidth - html.clientWidth;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    if (gap > 0) body.style.paddingRight = `${gap}px`;
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.paddingRight = prevBodyPaddingRight;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const load = useCallback(() => {
    if (!open || !tipsterUsername) return;
    setLoading(true);
    setError(null);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`${getApiUrl()}/tipsters/${encodeURIComponent(tipsterUsername)}/followers?limit=100`, { headers })
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to load followers');
        }
        return r.json();
      })
      .then((data: { total?: number; followers?: TipsterFollowerRow[] }) => {
        setTotal(data.total ?? 0);
        setFollowers(Array.isArray(data.followers) ? data.followers : []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, tipsterUsername]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const toggleFollow = async (row: TipsterFollowerRow) => {
    if (!row.tipster_username || row.is_self) return;
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = `/login?redirect=${encodeURIComponent(`/tipsters/${tipsterUsername}`)}`;
      return;
    }
    setActionUserId(row.user_id);
    const next = !row.you_follow_them;
    try {
      const res = await fetch(`${getApiUrl()}/tipsters/${encodeURIComponent(row.tipster_username)}/follow`, {
        method: next ? 'POST' : 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setFollowers((prev) =>
          prev.map((f) => (f.user_id === row.user_id ? { ...f, you_follow_them: next } : f)),
        );
        const msg = next ? t('tipster.toast_following') : t('tipster.toast_unfollowed');
        setFeedback(msg);
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = setTimeout(() => {
          setFeedback(null);
          feedbackTimerRef.current = null;
        }, 3500);
        onFollowersMutate?.();
      }
    } finally {
      setActionUserId(null);
    }
  };

  if (!open || !mounted) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="followers-modal-title"
      style={{ isolation: 'isolate' }}
    >
      {/* Solid scrim only — backdrop-blur causes repaint flicker on many mobile GPUs */}
      <button type="button" className="absolute inset-0 bg-black/55" aria-label={t('common.close')} onClick={onClose} />
      <div className="relative z-[1] w-full sm:max-w-md max-h-[85vh] sm:max-h-[80vh] rounded-t-2xl sm:rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xl flex flex-col">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border)]">
          <h2 id="followers-modal-title" className="text-base font-semibold text-[var(--text)] truncate pr-2">
            {tipsterDisplayName
              ? t('tipster.followers_of', { name: tipsterDisplayName })
              : t('tipster.followers_title')}
            {total > 0 ? <span className="text-[var(--text-muted)] font-normal"> ({total})</span> : null}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
            aria-label={t('common.close')}
          >
            ✕
          </button>
        </div>

        {feedback ? (
          <div
            className="px-4 py-2 text-sm font-medium text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-900/30 border-b border-emerald-200/60 dark:border-emerald-800/50"
            role="status"
          >
            {feedback}
          </div>
        ) : null}

        <div
          className="overflow-y-auto flex-1 min-h-[120px] px-3 py-3 sm:px-4 overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' as const }}
        >
          {loading && <p className="text-sm text-[var(--text-muted)] text-center py-8">{t('common.loading')}</p>}
          {!loading && error && <p className="text-sm text-red-600 dark:text-red-400 text-center py-6">{error}</p>}
          {!loading && !error && followers.length === 0 && (
            <p className="text-sm text-[var(--text-muted)] text-center py-8">{t('tipster.no_followers_yet')}</p>
          )}
          {!loading && !error && followers.length > 0 && (
            <ul className="space-y-2">
              {followers.map((row) => (
                <li
                  key={`${row.user_id}-${row.followed_at}`}
                  className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)]/40 p-3"
                >
                  <div className="min-w-0 flex-1 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--primary-light)] border border-[var(--border)] shrink-0 flex items-center justify-center text-sm font-bold text-[var(--primary)]">
                      {row.avatar_url ? (
                        <Image
                          src={getAvatarUrl(row.avatar_url, 40)!}
                          alt=""
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                          unoptimized={shouldUnoptimizeGoogleAvatar(getAvatarUrl(row.avatar_url, 40))}
                        />
                      ) : (
                        row.display_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      {row.tipster_username ? (
                        <Link
                          href={`/tipsters/${encodeURIComponent(row.tipster_username)}`}
                          className="font-medium text-[var(--text)] hover:text-[var(--primary)] truncate block"
                          onClick={onClose}
                        >
                          {row.display_name}
                        </Link>
                      ) : (
                        <p className="font-medium text-[var(--text)] truncate">{row.display_name}</p>
                      )}
                      <p className="text-xs text-[var(--text-muted)] truncate">
                        {row.tipster_username ? `@${row.tipster_username}` : t('tipster.follower_member')}
                      </p>
                    </div>
                  </div>
                  {row.tipster_username && !row.is_self && (
                    <button
                      type="button"
                      disabled={actionUserId === row.user_id}
                      onClick={() => toggleFollow(row)}
                      aria-label={row.you_follow_them ? t('tipster.unfollow') : t('tipster.follow')}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                        row.you_follow_them
                          ? 'bg-[var(--border)] text-[var(--text)] hover:bg-red-500/15 hover:text-red-600 dark:hover:text-red-400 border border-[var(--border)]'
                          : 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]'
                      }`}
                    >
                      {actionUserId === row.user_id
                        ? '…'
                        : row.you_follow_them
                          ? t('tipster.unfollow')
                          : t('tipster.follow')}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

/** Clickable follower count — opens modal (use outside `<Link>` to avoid nested navigation). */
export function FollowersCountButton({
  count,
  tipsterUsername,
  tipsterDisplayName,
  className = '',
  onFollowersMutate,
}: {
  count: number;
  tipsterUsername: string;
  tipsterDisplayName?: string;
  className?: string;
  onFollowersMutate?: () => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  if (count <= 0 || !tipsterUsername) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`text-left underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] rounded ${className}`}
      >
        {t(count === 1 ? 'tipster.x_follower' : 'tipster.x_followers', { n: String(count) })}
      </button>
      <TipsterFollowersModal
        open={open}
        onClose={() => setOpen(false)}
        tipsterUsername={tipsterUsername}
        tipsterDisplayName={tipsterDisplayName}
        onFollowersMutate={onFollowersMutate}
      />
    </>
  );
}
