'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getApiUrl } from '@/lib/site-config';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

interface AdminPickComment {
  id: number;
  body: string;
  createdAt: string;
  accumulatorId: number;
  parentId: number | null;
  pickTitle: string;
  user: { id: number; displayName: string; username: string };
}

export default function AdminPickCommentsPage() {
  const [items, setItems] = useState<AdminPickComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPickId, setFilterPickId] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      const pickId = filterPickId.trim();
      if (pickId) params.set('accumulatorId', pickId);
      const res = await fetch(`${getApiUrl()}/admin/pick-comments?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      setItems([]);
      showToast('Could not load comments');
    } finally {
      setLoading(false);
    }
  }, [filterPickId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async (comment: AdminPickComment) => {
    if (!confirm('Delete this comment?')) return;
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(
        `${getApiUrl()}/admin/pick-comments/${comment.id}?accumulatorId=${comment.accumulatorId}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error('Delete failed');
      setItems((prev) => prev.filter((c) => c.id !== comment.id));
      showToast('Comment removed');
    } catch {
      showToast('Delete failed');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex">
      <AdminSidebar />
      <main className="flex-1 p-4 md:p-8 md:ml-64 max-w-5xl">
        <h1 className="text-2xl font-bold text-[var(--text)] mb-1">Pick comments</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          Moderate comments on marketplace picks. Deletes are soft-deleted in the database.
        </p>

        <div className="flex flex-wrap gap-2 mb-6">
          <input
            type="text"
            inputMode="numeric"
            placeholder="Filter by pick ID"
            value={filterPickId}
            onChange={(e) => setFilterPickId(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] w-40"
          />
          <button
            type="button"
            onClick={() => void load()}
            className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold"
          >
            Refresh
          </button>
        </div>

        {toast ? (
          <p className="mb-4 text-sm text-[var(--primary)] font-medium">{toast}</p>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No comments found.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((c) => (
              <li
                key={c.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--text)]">
                      {c.user.displayName}
                      <span className="text-[var(--text-muted)] font-normal"> @{c.user.username}</span>
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {new Date(c.createdAt).toLocaleString()}
                      {c.parentId ? ' · reply' : ''} ·{' '}
                      <Link
                        href={`/coupons/${c.accumulatorId}`}
                        className="text-[var(--primary)] hover:underline"
                      >
                        {c.pickTitle} (#{c.accumulatorId})
                      </Link>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDelete(c)}
                    className="text-xs font-semibold text-rose-600 hover:underline shrink-0"
                  >
                    Delete
                  </button>
                </div>
                <p className="text-sm text-[var(--text)] whitespace-pre-wrap break-words">{c.body}</p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
