'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { SegmentedControl } from '@/components/ios/SegmentedControl';
import { IconBell } from '@/components/ios/icons';
import { PullToRefresh } from '@/components/ios/PullToRefresh';
import { useLanguage, useT } from '@/context/LanguageContext';
import { getApiUrl } from '@/lib/site-config';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead?: boolean;
  read?: boolean;
  createdAt: string;
}

function isNotificationRead(n: Notification): boolean {
  return n.isRead ?? n.read ?? false;
}

const TYPE_META: Record<string, { icon: string; color: string }> = {
  purchase:    { icon: '🛒', color: 'text-emerald-600' },
  settlement:  { icon: '✅', color: 'text-blue-600' },
  refund:      { icon: '💸', color: 'text-amber-600' },
  payout:      { icon: '💰', color: 'text-emerald-600' },
  withdrawal:  { icon: '🏦', color: 'text-violet-600' },
  withdrawal_done: { icon: '✅', color: 'text-emerald-600' },
  withdrawal_failed: { icon: '⚠️', color: 'text-red-600' },
  withdrawal_rejected: { icon: '🚫', color: 'text-orange-600' },
  system:      { icon: '📣', color: 'text-slate-500' },
  follow:      { icon: '👥', color: 'text-cyan-600' },
  subscription:{ icon: '⭐', color: 'text-yellow-500' },
};

function getTypeMeta(type: string) {
  const lower = type?.toLowerCase() ?? '';
  if (TYPE_META[lower]) return TYPE_META[lower];
  if (lower.includes('withdrawal')) return { icon: '💸', color: 'text-violet-600' };
  return { icon: '🔔', color: 'text-slate-500' };
}

export default function NotificationsPage() {
  const router = useRouter();
  const t = useT();
  const { lang } = useLanguage();
  const locale = lang === 'fr' ? 'fr-FR' : 'en-GB';

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1)  return t('notifications.just_now');
    if (m < 60) return t('notifications.min_ago', { m: String(m) });
    const h = Math.floor(m / 60);
    if (h < 24) return t('notifications.hour_ago', { h: String(h) });
    const d = Math.floor(h / 24);
    if (d < 7)  return t('notifications.day_ago', { d: String(d) });
    return new Date(dateStr).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  }
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const loadNotifications = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const r = await fetch(`${getApiUrl()}/notifications?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = r.ok ? await r.json() : [];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

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
    const unread = items.filter((n) => !isNotificationRead(n));
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

  const unreadCount = useMemo(() => items.filter((n) => !isNotificationRead(n)).length, [items]);

  const displayed = useMemo(
    () => (filter === 'unread' ? items.filter((n) => !isNotificationRead(n)) : items),
    [items, filter],
  );

  if (loading) {
    return (
      <DashboardShell>
        <div className="section-ux-dashboard-shell min-w-0 max-w-full">
          <LoadingSkeleton count={4} variant="list" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="min-h-[calc(100vh-8rem)] w-full min-w-0 max-w-full overflow-x-hidden bg-[var(--bg)]">
        <PullToRefresh onRefresh={loadNotifications} disabled={loading}>
        <div className="section-ux-dashboard-shell w-full min-w-0 max-w-full">

          {/* ─── Header row ──────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 min-w-0">
            <PageHeader
              label={t('notifications.title')}
              title={t('notifications.title')}
              tagline={t('notifications.tagline')}
            />
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0 min-w-0">
              <SegmentedControl
                aria-label={t('notifications.title')}
                className="w-full sm:w-auto"
                options={[
                  { value: 'all' as const, label: t('notifications.all', { n: String(items.length) }) },
                  { value: 'unread' as const, label: t('notifications.unread', { n: String(unreadCount) }) },
                ]}
                value={filter}
                onChange={setFilter}
              />
              {/* Mark all read */}
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  disabled={markingAll}
                  className="w-full sm:w-auto px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50"
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
            <div className="ios-grouped-section mx-0 min-w-0 max-w-full">
              {displayed.map((n) => {
                const meta = getTypeMeta(n.type);
                const content = (
                  <div
                    className={`ios-list-row flex items-start gap-3 px-4 py-3 border-b border-[var(--separator)] last:border-b-0 min-w-0 max-w-full transition-colors ${
                      !isNotificationRead(n) ? 'bg-[var(--primary-light)]/40' : ''
                    }`}
                  >
                    <div className={`relative shrink-0 w-9 h-9 rounded-full bg-[var(--fill-secondary)] flex items-center justify-center ${meta.color}`}>
                      <IconBell className="w-5 h-5" />
                      {!isNotificationRead(n) ? (
                        <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-[var(--primary)] ring-2 ring-[var(--card)]" />
                      ) : null}
                    </div>

                      {/* Body */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 min-w-0">
                          <p className={`text-sm font-semibold min-w-0 flex-1 pr-1 break-words ${isNotificationRead(n) ? 'text-[var(--text)]' : 'text-[var(--text)]'}`}>
                            {n.title}
                          </p>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">
                              {timeAgo(n.createdAt)}
                            </span>
                            {!isNotificationRead(n) && (
                              <span className="w-2 h-2 rounded-full bg-[var(--primary)] shrink-0" />
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-[var(--text-muted)] mt-0.5 leading-relaxed break-words min-w-0">
                          {n.message}
                        </p>
                        {/* Actions row */}
                        <div className="flex items-center gap-3 mt-2">
                          {!isNotificationRead(n) && (
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
                );

                return n.link ? (
                  <Link
                    key={n.id}
                    href={n.link}
                    onClick={() => markRead(n.id)}
                    className="block min-w-0 max-w-full"
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
        </PullToRefresh>
      </div>
    </DashboardShell>
  );
}
