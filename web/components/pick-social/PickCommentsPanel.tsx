'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { getAvatarUrl, getApiUrl, shouldUnoptimizeGoogleAvatar } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { useT } from '@/context/LanguageContext';

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
        <p className="text-sm text-[var(--text)] mt-0.5 break-words leading-relaxed">{comment.body}</p>
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
  onCountChangeRef.current = onCommentCountChange;
  const API_URL = getApiUrl();

  const syncTotal = (total: number) => {
    setTotalCount(total);
    onCountChangeRef.current?.(total);
  };

  const loadComments = useCallback(
    async (beforeId?: number, append = false) => {
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
      syncTotal(data.total ?? chronological.length);
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
    if (!loading && items.length > 0) {
      listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [loading, items.length]);

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
      if (created.parentId) {
        setItems((prev) =>
          prev.map((c) =>
            c.id === created.parentId
              ? { ...c, replies: [...(c.replies ?? []), created] }
              : c,
          ),
        );
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
      requestAnimationFrame(() => listEndRef.current?.scrollIntoView({ behavior: 'smooth' }));
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

  const handleDelete = async (commentId: number, isTopLevel: boolean) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/accumulators/${pickId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      setItems((prev) => {
        const target = isTopLevel ? prev.find((c) => c.id === commentId) : null;
        const removed = 1 + (target?.replies?.length ?? 0);
        const next = removeCommentFromTree(prev, commentId);
        setTotalCount((prevTotal) => {
          const delta = isTopLevel && target?.replies?.length ? removed : 1;
          const newTotal = Math.max(0, prevTotal - delta);
          onCountChangeRef.current?.(newTotal);
          return newTotal;
        });
        return next;
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
          <div key={c.id} className="space-y-2.5">
            <CommentBody
              comment={c}
              onReply={() => setReplyTo({ id: c.id, displayName: c.user.displayName })}
              onDelete={() => void handleDelete(c.id, true)}
            />
            {(c.replies ?? []).length > 0 && (
              <div className="pl-4 border-l-2 border-[var(--separator)] space-y-2.5 ml-3">
                {(c.replies ?? []).map((reply) => (
                  <CommentBody
                    key={reply.id}
                    comment={reply}
                    compact
                    onDelete={() => void handleDelete(reply.id, false)}
                  />
                ))}
              </div>
            )}
          </div>
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
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              replyTo
                ? t('pick_social.reply_placeholder', { name: replyTo.displayName })
                : t('pick_social.comment_placeholder')
            }
            rows={2}
            maxLength={500}
            className="flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--fill-secondary)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handlePost();
              }
            }}
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
      </div>
    </div>
  );
}
