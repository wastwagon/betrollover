'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { IconChevronRight } from './icons';

export function GroupedListSection({
  title,
  footer,
  children,
  className = '',
}: {
  title?: string;
  footer?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mb-6 ${className}`}>
      {title ? (
        <p className="px-4 mb-1.5 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
          {title}
        </p>
      ) : null}
      <div className="ios-grouped-section mx-4 sm:mx-0">{children}</div>
      {footer ? (
        <p className="px-4 mt-2 text-xs text-[var(--text-muted)] leading-relaxed">{footer}</p>
      ) : null}
    </section>
  );
}

export function GroupedListRow({
  children,
  className = '',
  destructive = false,
}: {
  children: ReactNode;
  className?: string;
  destructive?: boolean;
}) {
  return (
    <div
      className={`ios-list-row flex items-center gap-3 px-4 py-3 min-h-[44px] border-b border-[var(--separator)] last:border-b-0 ${
        destructive ? 'text-[var(--destructive)]' : 'text-[var(--text)]'
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function GroupedListLink({
  href,
  icon,
  label,
  detail,
  badge,
  badgeClassName = 'bg-[var(--primary)]',
  onClick,
}: {
  href: string;
  icon?: ReactNode;
  label: string;
  detail?: string;
  badge?: string;
  badgeClassName?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="ios-list-row flex items-center gap-3 px-4 py-3 min-h-[44px] border-b border-[var(--separator)] last:border-b-0 text-[var(--text)] hover:bg-[var(--fill-secondary)] active:bg-[var(--fill-secondary)] transition-colors touch-manipulation"
    >
      {icon ? <span className="text-[var(--primary)] shrink-0">{icon}</span> : null}
      <span className="flex-1 text-[15px] font-normal min-w-0">{label}</span>
      {detail ? <span className="text-sm text-[var(--text-muted)] shrink-0">{detail}</span> : null}
      {badge ? (
        <span
          className={`min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[11px] font-bold text-white rounded-full shrink-0 ${badgeClassName}`}
        >
          {badge}
        </span>
      ) : null}
      <IconChevronRight className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
    </Link>
  );
}

export function GroupedListButton({
  icon,
  label,
  onClick,
  destructive = false,
}: {
  icon?: ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ios-list-row w-full flex items-center gap-3 px-4 py-3 min-h-[44px] border-b border-[var(--separator)] last:border-b-0 hover:bg-[var(--fill-secondary)] active:bg-[var(--fill-secondary)] transition-colors touch-manipulation ${
        destructive ? 'text-[var(--destructive)]' : 'text-[var(--text)]'
      }`}
    >
      {icon ? <span className={destructive ? '' : 'text-[var(--primary)]'}>{icon}</span> : null}
      <span className="flex-1 text-left text-[15px]">{label}</span>
    </button>
  );
}
