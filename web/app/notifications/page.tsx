'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { SegmentedControl } from '@/components/ios/SegmentedControl';
import { PullToRefresh } from '@/components/ios/PullToRefresh';
import {
  NotificationListRow,
  isNotificationRead,
  type NotificationListItem,
} from '@/components/notifications/NotificationListRow';
import { useLanguage, useT } from '@/context/LanguageContext';
import { getApiUrl } from '@/lib/site-config';

export default function NotificationsPage() {
  const router = useRouter();
  const t = useT();
  const { lang } = useLanguage();
  const locale = lang === 'fr' ? 'fr-FR' : 'en-GB';

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1) return t('notifications.just_now');
    if (m < 60) return t('notifications.min_ago', { m: String(m) });
    const h = Math.floor(m / 60);
    if (h < 24) return t('notifications.hour_ago', { h: String(h) });
    const d = Math.floor(h / 24);
    if (d < 7) return t('notifications.day_ago', { d: String(d) });
    return new Date(dateStr).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  }

  const [items, setItems] = useState<NotificationListItem[]>([]);
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
    if (!token) {
      setMarkingAll(false);
      return;
    }
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
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 min-w-0">
              <PageHeader
                label={t('notifications.title')}
                title={t('notifications.title')}
                tagline={t('notifications.tagline')}
              />
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0 min-w-0">
                <Link
                  href="/profile#notification-preferences"
                  className="w-full sm:w-auto px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors text-center"
                >
                  {t('notifications.manage_settings')}
                </Link>
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

            {items.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]">
                <EmptyState
                  title={t('notifications.all_clear')}
                  description={t('notifications.all_clear_desc')}
                  actionLabel={t('notifications.browse_marketplace')}
                  actionHref="/marketplace"
                />
              </div>
            ) : displayed.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]">
                <EmptyState
                  title={t('notifications.no_unread')}
                  description={t('notifications.caught_up')}
                  actionLabel={t('notifications.show_all')}
                  actionHref="#"
                />
              </div>
            ) : (
              <div className="ios-grouped-section mx-0 min-w-0 max-w-full">
                {displayed.map((n) => {
                  const row = (
                    <NotificationListRow
                      notification={n}
                      timeLabel={timeAgo(n.createdAt)}
                      markReadLabel={t('notifications.mark_read')}
                      viewLabel={t('notifications.view')}
                      onMarkRead={markRead}
                      embedInLink={Boolean(n.link)}
                    />
                  );

                  return n.link ? (
                    <Link
                      key={n.id}
                      href={n.link}
                      onClick={() => markRead(n.id)}
                      className="block min-w-0 max-w-full"
                    >
                      {row}
                    </Link>
                  ) : (
                    <div key={n.id}>{row}</div>
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
