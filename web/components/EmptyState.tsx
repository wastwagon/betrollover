'use client';

import Link from 'next/link';

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onActionClick,
  icon = '📋',
}: {
  title: string;
  description: string;
  actionLabel: string;
  actionHref?: string;
  onActionClick?: () => void;
  icon?: string;
}) {
  const className = 'inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2';
  const hasAction = actionLabel && (onActionClick || actionHref);
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <span className="text-5xl mb-6" aria-hidden>{icon}</span>
      <h3 className="text-xl font-semibold text-[var(--text)] mb-3">{title}</h3>
      <p className="text-[var(--text-muted)] max-w-md mb-10 leading-relaxed">{description}</p>
      {hasAction && onActionClick ? (
        <button type="button" onClick={onActionClick} className={className}>
          {actionLabel}
        </button>
      ) : hasAction && actionHref ? (
        <Link href={actionHref} className={className}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
