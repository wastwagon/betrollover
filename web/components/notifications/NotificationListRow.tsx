'use client';

import Link from 'next/link';
import { useT } from '@/context/LanguageContext';
import { localizeNotification } from '@/lib/notification-display';
import { getNotificationVisual } from '@/lib/notification-ui';

export interface NotificationListItem {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  icon?: string | null;
  metadata?: Record<string, string> | null;
  isRead?: boolean;
  read?: boolean;
  createdAt: string;
}

export function isNotificationRead(n: NotificationListItem): boolean {
  return n.isRead ?? n.read ?? false;
}

export interface NotificationListRowProps {
  notification: NotificationListItem;
  timeLabel: string;
  markReadLabel: string;
  viewLabel: string;
  onMarkRead: (id: number) => void;
  /** Row sits inside an outer Link — omit nested action links. */
  embedInLink?: boolean;
}

export function NotificationListRow({
  notification: n,
  timeLabel,
  markReadLabel,
  viewLabel,
  onMarkRead,
  embedInLink = false,
}: NotificationListRowProps) {
  const t = useT();
  const { title, message } = localizeNotification(n, t);
  const visual = getNotificationVisual(n.type, n.icon);
  const { Icon } = visual;
  const unread = !isNotificationRead(n);

  return (
    <div
      className={`ios-list-row flex items-start gap-3 px-4 py-3 border-b border-[var(--separator)] last:border-b-0 min-w-0 max-w-full transition-colors ${
        unread ? 'bg-[var(--primary-light)]/40' : ''
      }`}
    >
      <div
        className={`relative shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${visual.bgClass} ${visual.colorClass}`}
      >
        <Icon className="w-5 h-5" />
        {unread ? (
          <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-[var(--primary)] ring-2 ring-[var(--card)]" />
        ) : null}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <p className="text-sm font-semibold min-w-0 flex-1 pr-1 break-words text-[var(--text)]">{title}</p>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">{timeLabel}</span>
            {unread ? <span className="w-2 h-2 rounded-full bg-[var(--primary)] shrink-0" /> : null}
          </div>
        </div>
        <p className="text-sm text-[var(--text-muted)] mt-0.5 leading-relaxed break-words min-w-0">{message}</p>
        {!embedInLink ? (
          <div className="flex items-center gap-3 mt-2">
            {unread ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onMarkRead(n.id);
                }}
                className="text-[10px] font-semibold text-[var(--primary)] hover:underline"
              >
                {markReadLabel}
              </button>
            ) : null}
            {n.link ? (
              <Link
                href={n.link}
                className="text-[10px] font-semibold text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                onClick={() => onMarkRead(n.id)}
              >
                {viewLabel}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
