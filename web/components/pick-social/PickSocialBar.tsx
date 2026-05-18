'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getAvatarUrl, getApiUrl, shouldUnoptimizeGoogleAvatar } from '@/lib/site-config';
import { IconHeart, IconChat } from '@/components/ios/icons';
import { BottomSheet } from '@/components/ios/BottomSheet';
import { PickCommentsPanel } from './PickCommentsPanel';
import { useT } from '@/context/LanguageContext';
import { hapticSuccess } from '@/lib/haptic';
import { requestPickSocialSummaryBatch } from '@/lib/pick-social-batch';

export interface PickSocialCounts {
  reactionCount: number;
  hasReacted: boolean;
  commentCount: number;
}

interface ReactorUser {
  id: number;
  displayName: string;
  avatarUrl: string | null;
}

interface PickSocialBarProps {
  pickId: number;
  reactionCount?: number;
  hasReacted?: boolean;
  commentCount?: number;
  enabled?: boolean;
  /** Skip mount-time social-summary when parent already hydrated counts from a list API. */
  socialCountsFromServer?: boolean;
  loginRedirectPath?: string;
  onCountsChange?: (counts: PickSocialCounts) => void;
}

export function PickSocialBar({
  pickId,
  reactionCount: reactionCountProp = 0,
  hasReacted: hasReactedProp = false,
  commentCount: commentCountProp = 0,
  enabled = true,
  socialCountsFromServer = false,
  loginRedirectPath = '/login',
  onCountsChange,
}: PickSocialBarProps) {
  const t = useT();
  const router = useRouter();
  const API_URL = getApiUrl();
  const [reactionCount, setReactionCount] = useState(reactionCountProp);
  const [hasReacted, setHasReacted] = useState(hasReactedProp);
  const [commentCount, setCommentCount] = useState(commentCountProp);
  const [reacting, setReacting] = useState(false);
  const [showReactors, setShowReactors] = useState(false);
  const [reactors, setReactors] = useState<ReactorUser[]>([]);
  const [reactorsLoading, setReactorsLoading] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReactionCount(reactionCountProp);
    setHasReacted(hasReactedProp);
    setCommentCount(commentCountProp);
  }, [reactionCountProp, hasReactedProp, commentCountProp]);

  useEffect(() => {
    if (!enabled || pickId <= 0) return;
    let cancelled = false;
    void requestPickSocialSummaryBatch(pickId).then((summary) => {
      if (cancelled || !summary) return;
      setReactionCount(summary.reactionCount);
      setHasReacted(summary.hasReacted);
      setCommentCount(summary.commentCount);
      onCountsChange?.(summary);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync counts once per pick id
  }, [pickId, enabled, socialCountsFromServer]);

  const emitCounts = useCallback(
    (next: Partial<PickSocialCounts>) => {
      const merged = {
        reactionCount: next.reactionCount ?? reactionCount,
        hasReacted: next.hasReacted ?? hasReacted,
        commentCount: next.commentCount ?? commentCount,
      };
      onCountsChange?.(merged);
    },
    [reactionCount, hasReacted, commentCount, onCountsChange],
  );

  const handleCommentCountChange = useCallback(
    (n: number) => {
      setCommentCount(n);
      emitCounts({ commentCount: n });
    },
    [emitCounts],
  );

  const requireAuth = (): boolean => {
    if (typeof window === 'undefined') return false;
    if (localStorage.getItem('token')) return true;
    router.push(loginRedirectPath);
    return false;
  };

  const fetchReactors = async () => {
    const token = localStorage.getItem('token');
    if (!token || reactionCount === 0) return;
    setReactorsLoading(true);
    try {
      const res = await fetch(`${API_URL}/accumulators/${pickId}/reactions?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReactors(data.users ?? []);
      }
    } finally {
      setReactorsLoading(false);
    }
  };

  const handleReact = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!enabled || !requireAuth() || reacting) return;
    void hapticSuccess();
    const token = localStorage.getItem('token');
    if (!token) return;
    setReacting(true);
    const nextReacted = !hasReacted;
    const prevCount = reactionCount;
    const nextCount = Math.max(0, prevCount + (nextReacted ? 1 : -1));
    setHasReacted(nextReacted);
    setReactionCount(nextCount);
    emitCounts({ reactionCount: nextCount, hasReacted: nextReacted });
    try {
      const res = await fetch(`${API_URL}/accumulators/${pickId}/${nextReacted ? 'react' : 'unreact'}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setHasReacted(!nextReacted);
        setReactionCount(prevCount);
        emitCounts({ reactionCount: prevCount, hasReacted: !nextReacted });
      }
    } catch {
      setHasReacted(!nextReacted);
      setReactionCount(prevCount);
      emitCounts({ reactionCount: prevCount, hasReacted: !nextReacted });
    } finally {
      setReacting(false);
    }
  };

  const openComments = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!enabled || !requireAuth()) return;
    void hapticSuccess();
    setCommentsOpen(true);
  };

  const onReactPointerEnter = () => {
    if (reactionCount === 0) return;
    hoverTimer.current = setTimeout(() => {
      setShowReactors(true);
      void fetchReactors();
    }, 350);
  };

  const onReactPointerLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
    setShowReactors(false);
  };

  useEffect(() => {
    const close = (ev: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(ev.target as Node)) {
        setShowReactors(false);
      }
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={barRef}
        className="flex items-center gap-3 py-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative"
          onMouseEnter={onReactPointerEnter}
          onMouseLeave={onReactPointerLeave}
          onFocus={onReactPointerEnter}
          onBlur={onReactPointerLeave}
        >
          <button
            type="button"
            onClick={handleReact}
            disabled={reacting}
            aria-pressed={hasReacted}
            aria-label={t('pick_social.like_pick')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              hasReacted
                ? 'bg-[var(--primary)]/15 text-[var(--primary)]'
                : 'bg-[var(--fill-secondary)] text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10'
            } ${reacting ? 'opacity-60' : ''}`}
          >
            <IconHeart className="w-4 h-4" filled={hasReacted} />
            <span>{reactionCount > 0 ? reactionCount : t('pick_social.like')}</span>
          </button>
          {showReactors && reactionCount > 0 && (
            <div
              role="tooltip"
              className="absolute left-0 bottom-full mb-1 z-30 min-w-[10rem] max-w-[14rem] rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-lg p-2 text-left"
            >
              <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 px-1">
                {t('pick_social.reacted_by')}
              </p>
              {reactorsLoading ? (
                <p className="text-xs text-[var(--text-muted)] px-1 py-1">{t('common.loading')}</p>
              ) : reactors.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] px-1 py-1">{t('pick_social.no_reactors')}</p>
              ) : (
                <ul className="max-h-32 overflow-y-auto space-y-1">
                  {reactors.map((u) => (
                    <li key={u.id} className="flex items-center gap-2 px-1 py-0.5">
                      <ReactorAvatar user={u} />
                      <span className="text-xs text-[var(--text)] truncate">{u.displayName}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={openComments}
          aria-label={t('pick_social.open_comments')}
          title={
            typeof window !== 'undefined' && !localStorage.getItem('token')
              ? t('pick_social.sign_in_to_comment')
              : undefined
          }
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-[var(--fill-secondary)] text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
        >
          <IconChat className="w-4 h-4" />
          <span>
            {commentCount > 0
              ? t('pick_social.comments_count', { n: String(commentCount) })
              : t('pick_social.comment')}
          </span>
        </button>
      </div>

      <BottomSheet
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        title={t('pick_social.comments_title')}
        doneLabel={t('pick_card.close')}
        maxHeightClass="max-h-[min(92dvh,720px)]"
      >
        <PickCommentsPanel pickId={pickId} onCommentCountChange={handleCommentCountChange} />
      </BottomSheet>

    </>
  );
}

function ReactorAvatar({ user }: { user: ReactorUser }) {
  const [err, setErr] = useState(false);
  const url = user.avatarUrl ? getAvatarUrl(user.avatarUrl, 24) : null;
  if (url && !err) {
    return (
      <div className="w-6 h-6 rounded-full overflow-hidden bg-[var(--border)] shrink-0 relative">
        <Image
          src={url}
          alt=""
          width={24}
          height={24}
          className="object-cover w-full h-full"
          unoptimized={shouldUnoptimizeGoogleAvatar(url)}
          onError={() => setErr(true)}
        />
      </div>
    );
  }
  return (
    <div className="w-6 h-6 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center text-[10px] font-bold shrink-0">
      {(user.displayName || '?').charAt(0).toUpperCase()}
    </div>
  );
}
