'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { getAvatarUrl, getApiUrl, shouldUnoptimizeGoogleAvatar } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { useT } from '@/context/LanguageContext';
import { CommentBodyText } from '@/components/pick-social/CommentBodyText';
import { scrollCommentsToEnd, shouldAutoScrollComments } from '@/lib/comment-scroll';
import { CommentMentionTextarea } from '@/components/pick-social/CommentMentionTextarea';
import {
  addReplyToTree,
  findInTree,
  maxCommentIdInTree,
  mergePollComments,
} from '@/lib/pick-comment-tree';

export interface PickCommentItem {
  id: number;
  body: string;
  createdAt: string;
  parentId?: number | null;
  isOwn: boolean;
  user: { id: number; displayName: string; avatarUrl: string | null };
  replies?: PickCommentItem[];
}

interface PickCommentsPanelProps {
  pickId: number;
  onCommentCountChange?: (count: number) => void;
}

function formatCommentTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function normalizeComment(c: PickCommentItem): PickCommentItem {
  return {
    ...c,
    createdAt: typeof c.createdAt === 'string' ? c.createdAt : new Date(c.createdAt).toISOString(),
    replies: (c.replies ?? []).map(normalizeComment),
  };
}

function CommentAvatar({ user, size = 32 }: { user: PickCommentItem['user']; size?: number }) {
  const [err, setErr] = useState(false);
  const url = user.avatarUrl ? getAvatarUrl(user.avatarUrl, size) : null;
  if (url && !err) {
    return (
      <div
        className="rounded-full overflow-hidden bg-[var(--border)] shrink-0 relative"
        style={{ width: size, height: size }}
      >
        <Image
          src={url}
          alt=""
          width={size}
          height={size}
          className="object-cover w-full h-full"
          unoptimized={shouldUnoptimizeGoogleAvatar(url)}
          onError={() => setErr(true)}
        />
      </div>
    );
  }
  return (
    <div
      className="rounded-full bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {(user.displayName || '?').charAt(0).toUpperCase()}
    </div>
  );
}

function countSubtree(comment: PickCommentItem): number {
  return 1 + (comment.replies ?? []).reduce((sum, r) => sum + countSubtree(r), 0);
}

function CommentThread({
  comment,
  depth,
  onReply,
  onDelete,
}: {
  comment: PickCommentItem;
  depth: number;
  onReply: (comment: PickCommentItem) => void;
  onDelete: (comment: PickCommentItem) => void;
}) {
  const compact = depth > 0;
  return (
    <div className={depth > 0 ? 'mt-2.5' : ''}>
      <div className={depth > 0 ? 'pl-3 sm:pl-4 border-l-2 border-[var(--separator)] ml-1' : ''}>
        <CommentBody
          comment={comment}
          compact={compact}
          onReply={() => onReply(comment)}
          onDelete={() => onDelete(comment)}
        />
        {(comment.replies ?? []).map((reply) => (
          <CommentThread
            key={reply.id}
            comment={reply}
            depth={depth + 1}
            onReply={onReply}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

function CommentBody({
  comment,
  onReply,
  onDelete,
  compact = false,
}: {
  comment: PickCommentItem;
  onReply?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}) {
  const t = useT();
  return (
    <div className={`flex gap-2 ${compact ? 'ml-0' : ''} group`}>
      <CommentAvatar user={comment.user} size={compact ? 28 : 32} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-xs font-semibold text-[var(--text)]">{comment.user.displayName}</span>
          <span className="text-[10px] text-[var(--text-muted)]">{formatCommentTime(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-[var(--text)] mt-0.5 break-words leading-relaxed">
          <CommentBodyText body={comment.body} />
        </p>
        <div className="flex items-center gap-3 mt-1">
          {onReply && (
            <button
              type="button"
              onClick={onReply}
              className="text-[10px] font-medium text-[var(--primary)] hover:underline"
            >
              {t('pick_social.reply')}
            </button>
          )}
          {comment.isOwn && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="text-[10px] text-[var(--text-muted)] hover:text-rose-600 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity"
            >
              {t('pick_social.delete_comment')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function PickCommentsPanel({ pickId, onCommentCountChange }: PickCommentsPanelProps) {
  const t = useT();
  const [items, setItems] = useState<PickCommentItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: number; displayName: string } | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const onCountChangeRef = useRef(onCommentCountChange);
  const latestSnapshotRef = useRef({ total: 0, latestId: 0 });
  const pollIdleRef = useRef(0);
  const didInitialScrollRef = useRef(false);
  const itemsRef = useRef<PickCommentItem[]>([]);
  onCountChangeRef.current = onCommentCountChange;
  const API_URL = getApiUrl();
  itemsRef.current = items;

  const syncTotal = (total: number) => {
    setTotalCount(total);
    onCountChangeRef.current?.(total);
  };

  const loadComments = useCallback(
    async (beforeId?: number, append = false, silent = false) => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error(t('pick_social.sign_in_to_view_comments'));
      }
      const params = new URLSearchParams({ limit: '25' });
      if (beforeId) params.set('beforeId', String(beforeId));
      const res = await fetch(`${API_URL}/accumulators/${pickId}/comments?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(getApiErrorMessage(err, 'Failed to load comments'));
      }
      const data = await res.json();
      const fetched: PickCommentItem[] = (data.items ?? []).map((c: PickCommentItem) => normalizeComment(c));
      const chronological = [...fetched].reverse();
      const total = data.total ?? chronological.length;
      const latestId = chronological[chronological.length - 1]?.id ?? 0;
      if (
        silent &&
        !append &&
        latestSnapshotRef.current.total === total &&
        latestSnapshotRef.current.latestId === latestId
      ) {
        return;
      }
      latestSnapshotRef.current = { total, latestId };
      syncTotal(total);
      setHasMore(data.hasMore === true);
      if (append) {
        setItems((prev) => [...chronological, ...prev]);
      } else {
        setItems(chronological);
      }
    },
    [API_URL, pickId, t],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setReplyTo(null);
    loadComments()
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadComments]);

  useEffect(() => {
    if (!loading && items.length > 0 && !didInitialScrollRef.current) {
      didInitialScrollRef.current = true;
      requestAnimationFrame(() => scrollCommentsToEnd(listEndRef.current));
    }
  }, [loading, items.length]);

  useEffect(() => {
    if (!loading) return;
    didInitialScrollRef.current = false;
  }, [loading, pickId]);

  const pollNewComments = useCallback(async () => {
    if (loading || posting || document.visibilityState !== 'visible') return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const afterId = maxCommentIdInTree(itemsRef.current);
    if (afterId <= 0) return;
    try {
      const res = await fetch(`${API_URL}/accumulators/${pickId}/comments/poll?afterId=${afterId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const incoming: PickCommentItem[] = (data.items ?? []).map((c: PickCommentItem) => normalizeComment(c));
      if (incoming.length === 0) {
        pollIdleRef.current += 1;
        if (typeof data.total === 'number') {
          syncTotal(data.total);
        }
        return;
      }
      pollIdleRef.current = 0;
      setItems((prev) => {
        const { tree, needsFullReload } = mergePollComments(prev, incoming);
        if (needsFullReload) {
          void loadComments(undefined, false, true);
          return prev;
        }
        return tree;
      });
      if (typeof data.total === 'number') {
        syncTotal(data.total);
      }
      if (shouldAutoScrollComments(listEndRef.current)) {
        requestAnimationFrame(() => scrollCommentsToEnd(listEndRef.current));
      }
    } catch {
      /* noop */
    }
  }, [API_URL, pickId, loading, posting, loadComments]);

  /** Incremental poll (chat-style) + occasional full sync for consistency. */
  useEffect(() => {
    if (loading || posting) return;
    let cancelled = false;
    let pollTimer: number | undefined;

    const schedulePoll = () => {
      const delay = pollIdleRef.current >= 4 ? 12_000 : 5_000;
      pollTimer = window.setTimeout(() => {
        if (cancelled) return;
        void pollNewComments().finally(() => {
          if (!cancelled) schedulePoll();
        });
      }, delay);
    };

    schedulePoll();
    const syncId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      loadComments(undefined, false, true).catch(() => {});
    }, 60_000);

    return () => {
      cancelled = true;
      if (pollTimer) window.clearTimeout(pollTimer);
      window.clearInterval(syncId);
    };
  }, [loading, posting, pollNewComments, loadComments]);

  const handlePost = async () => {
    const trimmed = text.trim();
    if (!trimmed || posting) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/accumulators/${pickId}/comments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          body: trimmed,
          ...(replyTo ? { parentId: replyTo.id } : {}),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(getApiErrorMessage(err, 'Failed to post comment'));
      }
      const created = normalizeComment(await res.json());
      if (created.parentId != null) {
        setItems((prev) => addReplyToTree(prev, created.parentId as number, created));
      } else {
        setItems((prev) => [...prev, { ...created, replies: created.replies ?? [] }]);
      }
      setTotalCount((prev) => {
        const next = prev + 1;
        onCountChangeRef.current?.(next);
        return next;
      });
      setText('');
      setReplyTo(null);
      requestAnimationFrame(() => scrollCommentsToEnd(listEndRef.current));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post');
    } finally {
      setPosting(false);
    }
  };

  const removeCommentFromTree = (list: PickCommentItem[], commentId: number): PickCommentItem[] => {
    return list
      .filter((c) => c.id !== commentId)
      .map((c) => ({
        ...c,
        replies: c.replies ? removeCommentFromTree(c.replies, commentId) : [],
      }));
  };

  const handleDelete = async (comment: PickCommentItem) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/accumulators/${pickId}/comments/${comment.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const removed = countSubtree(comment);
      setItems((prev) => removeCommentFromTree(prev, comment.id));
      setTotalCount((prevTotal) => {
        const newTotal = Math.max(0, prevTotal - removed);
        onCountChangeRef.current?.(newTotal);
        return newTotal;
      });
    } catch {
      /* noop */
    }
  };

  const loadOlder = async () => {
    if (loadingMore || !hasMore || items.length === 0) return;
    setLoadingMore(true);
    try {
      await loadComments(items[0]?.id, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[240px]">
      <div className="px-4 py-3 space-y-4">
        {hasMore && (
          <button
            type="button"
            onClick={loadOlder}
            disabled={loadingMore}
            className="w-full text-xs font-medium text-[var(--primary)] py-1 disabled:opacity-50"
          >
            {loadingMore ? t('common.loading') : t('pick_social.load_older_comments')}
          </button>
        )}
        {loading && items.length === 0 && (
          <p className="text-sm text-[var(--text-muted)] text-center py-8">{t('common.loading')}</p>
        )}
        {!loading && error && !items.length && (
          <p className="text-sm text-rose-600 text-center py-6">{error}</p>
        )}
        {!loading && items.length === 0 && !error && (
          <p className="text-sm text-[var(--text-muted)] text-center py-8">{t('pick_social.no_comments_yet')}</p>
        )}
        {items.map((c) => (
          <CommentThread
            key={c.id}
            comment={c}
            depth={0}
            onReply={(target) => setReplyTo({ id: target.id, displayName: target.user.displayName })}
            onDelete={(target) => void handleDelete(target)}
          />
        ))}
        <div ref={listEndRef} />
      </div>
      <div className="sticky bottom-0 z-10 border-t border-[var(--separator)] p-3 bg-[var(--card)]">
        {replyTo && (
          <div className="flex items-center justify-between gap-2 mb-2 text-xs">
            <span className="text-[var(--text-muted)]">
              {t('pick_social.replying_to', { name: replyTo.displayName })}
            </span>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="text-[var(--primary)] font-medium"
            >
              {t('pick_social.cancel_reply')}
            </button>
          </div>
        )}
        {error && items.length > 0 ? <p className="text-xs text-rose-600 mb-2">{error}</p> : null}
        <div className="flex gap-2">
          <CommentMentionTextarea
            value={text}
            onChange={setText}
            onSubmit={() => void handlePost()}
            placeholder={
              replyTo
                ? t('pick_social.reply_placeholder', { name: replyTo.displayName })
                : t('pick_social.comment_placeholder')
            }
            disabled={posting}
          />
          <button
            type="button"
            onClick={() => void handlePost()}
            disabled={posting || !text.trim()}
            className="self-end px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold disabled:opacity-50 shrink-0"
          >
            {posting ? '…' : replyTo ? t('pick_social.post_reply') : t('pick_social.post_comment')}
          </button>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-1.5">{t('pick_social.mention_hint')}</p>
      </div>
    </div>
  );
}
