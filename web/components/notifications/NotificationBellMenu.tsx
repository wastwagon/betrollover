'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/site-config';
import { useLanguage, useT } from '@/context/LanguageContext';
import { getNotificationVisual } from '@/lib/notification-ui';
import { localizeNotification } from '@/lib/notification-display';
import {
  isNotificationRead,
  type NotificationListItem,
} from '@/components/notifications/NotificationListRow';

interface NotificationBellMenuProps {
  /** Re-fetch when route changes (e.g. pathname). */
  refreshKey?: string;
  className?: string;
  /** Desktop header uses slate styling; dashboard uses theme tokens. */
  variant?: 'marketing' | 'dashboard';
  onUnreadCountChange?: (count: number) => void;
}

export function NotificationBellMenu({
  refreshKey,
  className = '',
  variant = 'marketing',
  onUnreadCountChange,
}: NotificationBellMenuProps) {
  const router = useRouter();
  const t = useT();
  const { lang } = useLanguage();
  const locale = lang === 'fr' ? 'fr-FR' : 'en-GB';
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationListItem[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setItems([]);
      onUnreadCountChange?.(0);
      return;
    }
    try {
      const r = await fetch(`${getApiUrl()}/notifications?limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = r.ok ? await r.json() : [];
      const list = Array.isArray(data) ? (data as NotificationListItem[]) : [];
      setItems(list);
      onUnreadCountChange?.(list.filter((n) => !isNotificationRead(n)).length);
    } catch {
      setItems([]);
      onUnreadCountChange?.(0);
    }
  }, [onUnreadCountChange]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const markRead = async (id: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    await fetch(`${getApiUrl()}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    setItems((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, isRead: true } : n));
      onUnreadCountChange?.(next.filter((n) => !isNotificationRead(n)).length);
      return next;
    });
  };

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

  const unreadCount = items.filter((n) => !isNotificationRead(n)).length;

  const bellBtnClass =
    variant === 'dashboard'
      ? 'relative p-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-warm)] transition-colors'
      : 'relative p-2.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors';

  const panelClass =
    variant === 'dashboard'
      ? 'absolute right-0 top-full mt-2 w-[min(100vw-2rem,22rem)] rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xl shadow-black/10 z-[200] overflow-hidden'
      : 'absolute right-0 top-full mt-2 w-[min(100vw-2rem,22rem)] rounded-2xl border border-slate-200 bg-white shadow-xl shadow-black/10 z-[200] overflow-hidden dark:border-slate-700 dark:bg-slate-900';

  const navigate = (n: NotificationListItem) => {
    void markRead(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={bellBtnClass}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={
          unreadCount > 0
            ? t('notifications.bell_unread', { n: String(unreadCount) })
            : t('nav.notifications')
        }
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 ? (
          <span
            className={`absolute top-1.5 right-1.5 min-w-[16px] h-[16px] flex items-center justify-center text-[9px] font-bold text-white rounded-full ring-2 ${
              variant === 'dashboard' ? 'bg-[var(--accent)] ring-white' : 'bg-red-500 ring-white'
            }`}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className={panelClass} role="menu" aria-label={t('notifications.recent')}>
          <div
            className={`flex items-center justify-between px-4 py-3 border-b ${
              variant === 'dashboard' ? 'border-[var(--separator)]' : 'border-slate-100 dark:border-slate-800'
            }`}
          >
            <p className="text-sm font-semibold text-[var(--text)]">{t('notifications.recent')}</p>
            {unreadCount > 0 ? (
              <span className="text-[10px] font-semibold text-[var(--primary)]">
                {t('notifications.unread', { n: String(unreadCount) })}
              </span>
            ) : null}
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[var(--text-muted)] text-center">{t('notifications.preview_empty')}</p>
          ) : (
            <ul className="max-h-[min(60vh,20rem)] overflow-y-auto overscroll-contain">
              {items.map((n) => {
                const visual = getNotificationVisual(n.type, n.icon);
                const { Icon } = visual;
                const { title, message } = localizeNotification(n, t);
                const unread = !isNotificationRead(n);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => navigate(n)}
                      className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors ${
                        unread
                          ? 'bg-[var(--primary-light)]/30 hover:bg-[var(--primary-light)]/50'
                          : 'hover:bg-[var(--fill-secondary)]'
                      }`}
                    >
                      <div
                        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${visual.bgClass} ${visual.colorClass}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-[var(--text)] line-clamp-1">{title}</p>
                          <span className="text-[10px] text-[var(--text-muted)] shrink-0">{timeAgo(n.createdAt)}</span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2 leading-snug">{message}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div
            className={`border-t px-4 py-2.5 ${
              variant === 'dashboard' ? 'border-[var(--separator)]' : 'border-slate-100 dark:border-slate-800'
            }`}
          >
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-semibold text-[var(--primary)] hover:underline py-1"
            >
              {t('notifications.view_all')}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}