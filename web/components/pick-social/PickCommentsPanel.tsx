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
  isOwn: boolean;
  user: { id: number; displayName: string; avatarUrl: string | null };
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

function CommentAvatar({ user }: { user: PickCommentItem['user'] }) {
  const [err, setErr] = useState(false);
  const url = user.avatarUrl ? getAvatarUrl(user.avatarUrl, 32) : null;
  if (url && !err) {
    return (
      <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--border)] shrink-0 relative">
        <Image
          src={url}
          alt=""
          width={32}
          height={32}
          className="object-cover w-full h-full"
          unoptimized={shouldUnoptimizeGoogleAvatar(url)}
          onError={() => setErr(true)}
        />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center text-xs font-bold shrink-0">
      {(user.displayName || '?').charAt(0).toUpperCase()}
    </div>
  );
}

export function PickCommentsPanel({ pickId, onCommentCountChange }: PickCommentsPanelProps) {
  const t = useT();
  const [items, setItems] = useState<PickCommentItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const API_URL = getApiUrl();

  const loadComments = useCallback(
    async (beforeId?: number, append = false) => {
      const token = localStorage.getItem('token');
      if (!token) return;
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
      const fetched: PickCommentItem[] = (data.items ?? []).map((c: PickCommentItem) => ({
        ...c,
        createdAt: typeof c.createdAt === 'string' ? c.createdAt : new Date(c.createdAt).toISOString(),
      }));
      const chronological = [...fetched].reverse();
      onCommentCountChange?.(data.total ?? chronological.length);
      setHasMore(data.hasMore === true);
      if (append) {
        setItems((prev) => [...chronological, ...prev]);
      } else {
        setItems(chronological);
      }
    },
    [API_URL, pickId, onCommentCountChange],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
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
        body: JSON.stringify({ body: trimmed }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(getApiErrorMessage(err, 'Failed to post comment'));
      }
      const created = await res.json();
      const entry: PickCommentItem = {
        id: created.id,
        body: created.body,
        createdAt:
          typeof created.createdAt === 'string'
            ? created.createdAt
            : new Date(created.createdAt).toISOString(),
        isOwn: true,
        user: created.user,
      };
      setItems((prev) => {
        const next = [...prev, entry];
        onCommentCountChange?.(next.length);
        return next;
      });
      setText('');
      requestAnimationFrame(() => listEndRef.current?.scrollIntoView({ behavior: 'smooth' }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post');
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/accumulators/${pickId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      setItems((prev) => {
        const next = prev.filter((c) => c.id !== commentId);
        onCommentCountChange?.(next.length);
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
    <div className="flex flex-col min-h-[280px] max-h-[min(70dvh,520px)]">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
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
        {loading && (
          <p className="text-sm text-[var(--text-muted)] text-center py-8">{t('common.loading')}</p>
        )}
        {!loading && error && !items.length && (
          <p className="text-sm text-rose-600 text-center py-6">{error}</p>
        )}
        {!loading && items.length === 0 && !error && (
          <p className="text-sm text-[var(--text-muted)] text-center py-8">{t('pick_social.no_comments_yet')}</p>
        )}
        {items.map((c) => (
          <div key={c.id} className="flex gap-2.5 group">
            <CommentAvatar user={c.user} />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xs font-semibold text-[var(--text)]">{c.user.displayName}</span>
                <span className="text-[10px] text-[var(--text-muted)]">{formatCommentTime(c.createdAt)}</span>
              </div>
              <p className="text-sm text-[var(--text)] mt-0.5 break-words leading-relaxed">{c.body}</p>
              {c.isOwn && (
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  className="text-[10px] text-[var(--text-muted)] hover:text-rose-600 mt-1 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity"
                >
                  {t('pick_social.delete_comment')}
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={listEndRef} />
      </div>
      <div className="border-t border-[var(--separator)] p-3 bg-[var(--card)]">
        {error && items.length > 0 ? <p className="text-xs text-rose-600 mb-2">{error}</p> : null}
        <div className="flex gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('pick_social.comment_placeholder')}
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
            {posting ? '…' : t('pick_social.post_comment')}
          </button>
        </div>
      </div>
    </div>
  );
}
