'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { useT } from '@/context/LanguageContext';
import { getApiUrl } from '@/lib/site-config';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_META: Record<string, { icon: string; color: string }> = {
  purchase:    { icon: '🛒', color: 'text-emerald-600' },
  settlement:  { icon: '✅', color: 'text-blue-600' },
  refund:      { icon: '💸', color: 'text-amber-600' },
  payout:      { icon: '💰', color: 'text-emerald-600' },
  withdrawal:  { icon: '🏦', color: 'text-violet-600' },
  system:      { icon: '📣', color: 'text-slate-500' },
  follow:      { icon: '👥', color: 'text-cyan-600' },
  subscription:{ icon: '⭐', color: 'text-yellow-500' },
};

function getTypeMeta(type: string) {
  return TYPE_META[type?.toLowerCase()] ?? { icon: '🔔', color: 'text-slate-500' };
}

export default function NotificationsPage() {
  const router = useRouter();
  const t = useT();

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1)  return t('notifications.just_now');
    if (m < 60) return t('notifications.min_ago', { m: String(m) });
    const h = Math.floor(m / 60);
    if (h < 24) return t('notifications.hour_ago', { h: String(h) });
    const d = Math.floor(h / 24);
    if (d < 7)  return t('notifications.day_ago', { d: String(d) });
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetch(`${getApiUrl()}/notifications?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [router]);

  const markRead = async (id: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    await fetch(`${getApiUrl()}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const markAllRead = async () => {
    const unread = items.filter((n) => !n.isRead);
    if (unread.length === 0) return;
    setMarkingAll(true);
    const token = localStorage.getItem('token');
    if (!token) { setMarkingAll(false); return; }
    await Promise.allSettled(
      unread.map((n) =>
        fetch(`${getApiUrl()}/notifications/${n.id}/read`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        }),
      ),
    );
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setMarkingAll(false);
  };

  const unreadCount = useMemo(() => items.filter((n) => !n.isRead).length, [items]);

  const displayed = useMemo(
    () => (filter === 'unread' ? items.filter((n) => !n.isRead) : items),
    [items, filter],
  );

  if (loading) {
    return (
      <DashboardShell>
        <div className="w-full px-4 sm:px-5 md:px-6 lg:px-8 py-5 md:py-6 pb-24">
          <LoadingSkeleton count={4} variant="list" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="dashboard-bg dashboard-pattern min-h-[calc(100vh-8rem)]">
        <div className="w-full px-4 sm:px-5 md:px-6 lg:px-8 py-5 md:py-6 pb-24">

          {/* ─── Header row ──────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
            <PageHeader
              label={t('notifications.title')}
              title={t('notifications.title')}
              tagline={t('notifications.tagline')}
            />
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Filter tabs */}
              <div className="flex rounded-lg border border-[var(--border)] overflow-hidden bg-[var(--card)]">
                {(['all', 'unread'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                      filter === f
                        ? 'bg-[var(--primary)] text-white'
                        : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {f === 'all' ? t('notifications.all', { n: String(items.length) }) : t('notifications.unread', { n: String(unreadCount) })}
                  </button>
                ))}
              </div>
              {/* Mark all read */}
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  disabled={markingAll}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50"
                >
                  {markingAll ? t('notifications.marking') : t('notifications.mark_all_read')}
                </button>
              )}
            </div>
          </div>

          {/* ─── Content ─────────────────────────────────── */}
          {items.length === 0 ? (
            <div className="card-gradient rounded-2xl">
              <EmptyState
                title={t('notifications.all_clear')}
                description={t('notifications.all_clear_desc')}
                actionLabel={t('notifications.browse_marketplace')}
                actionHref="/marketplace"
                icon="🔔"
              />
            </div>
          ) : displayed.length === 0 ? (
            <div className="card-gradient rounded-2xl">
              <EmptyState
                title={t('notifications.no_unread')}
                description={t('notifications.caught_up')}
                actionLabel={t('notifications.show_all')}
                actionHref="#"
                icon="✅"
              />
            </div>
          ) : (
            <div className="space-y-2">
              {displayed.map((n) => {
                const meta = getTypeMeta(n.type);
                const content = (
                  <div
                    className={`card-gradient rounded-2xl p-4 transition-all duration-200 hover:shadow-md ${
                      !n.isRead
                        ? 'border-l-4 border-l-[var(--primary)]'
                        : 'opacity-75 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-9 h-9 rounded-full bg-[var(--bg)] flex items-center justify-center text-lg border border-[var(--border)]`}>
                        {meta.icon}
                      </div>

                      {/* Body */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-semibold ${n.isRead ? 'text-[var(--text)]' : 'text-[var(--text)]'}`}>
                            {n.title}
                          </p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">
                              {timeAgo(n.createdAt)}
                            </span>
                            {!n.isRead && (
                              <span className="w-2 h-2 rounded-full bg-[var(--primary)] flex-shrink-0" />
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-[var(--text-muted)] mt-0.5 leading-relaxed">
                          {n.message}
                        </p>
                        {/* Actions row */}
                        <div className="flex items-center gap-3 mt-2">
                          {!n.isRead && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                markRead(n.id);
                              }}
                              className="text-[10px] font-semibold text-[var(--primary)] hover:underline"
                            >
                              {t('notifications.mark_read')}
                            </button>
                          )}
                          {n.link && (
                            <Link
                              href={n.link}
                              className="text-[10px] font-semibold text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                              onClick={() => markRead(n.id)}
                            >
                              {t('notifications.view')}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );

                return n.link ? (
                  <Link
                    key={n.id}
                    href={n.link}
                    onClick={() => markRead(n.id)}
                    className="block"
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={n.id}>{content}</div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </DashboardShell>
  );
}
