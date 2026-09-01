'use client';

import Link from 'next/link';

export function StatCard({
  title,
  value,
  icon,
  format = 'number',
  suffix = '',
  link,
  variant = 'teal',
  glass = false,
  displayValue,
  hint,
}: {
  title: string;
  value: number;
  icon?: string;
  format?: 'number' | 'currency';
  suffix?: string;
  link?: string;
  variant?: 'teal' | 'emerald' | 'amber' | 'slate';
  glass?: boolean;
  index?: number;
  displayValue?: string;
  hint?: string;
}) {
  const display = displayValue ?? (format === 'currency' ? value.toFixed(2) : value.toString());
  const variantStyles = {
    teal: 'border-l-4 border-l-[var(--primary)]',
    emerald: 'border-l-4 border-l-[var(--primary)]',
    amber: 'border-l-4 border-l-[var(--accent)]',
    slate: 'border-l-4 border-l-[var(--separator)]',
  };
  const iconBg = {
    teal: 'bg-[var(--fill-secondary)] text-[var(--primary)]',
    emerald: 'bg-[var(--fill-secondary)] text-[var(--primary)]',
    amber: 'bg-[var(--fill-secondary)] text-[var(--accent)]',
    slate: 'bg-[var(--fill-secondary)] text-[var(--text-muted)]',
  };
  const iconLabel = (icon ?? (title.trim().charAt(0) || '?')).slice(0, 2).toUpperCase();
  const baseCard = glass
    ? `rounded-[var(--radius)] p-4 sm:p-5 border border-[var(--separator)] bg-[var(--card)] transition-colors hover:border-[var(--primary)]/35 min-w-0 ${variantStyles[variant]}`
    : `rounded-[var(--radius)] border border-[var(--separator)] p-5 bg-[var(--card)] transition-colors hover:border-[var(--primary)]/35 min-w-0 ${variantStyles[variant]}`;
  const content = (
    <div className={baseCard}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3 min-w-0">
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${iconBg[variant]}`}>
          {iconLabel}
        </div>
        <span className="text-xl sm:text-2xl font-bold text-[var(--text)] tabular-nums truncate text-left sm:text-right sm:ml-auto">{display}{suffix}</span>
      </div>
      <p className="text-xs sm:text-sm font-medium text-[var(--text-muted)] mt-2 sm:mt-3">{title}</p>
      {hint ? <p className="text-[10px] sm:text-xs text-[var(--text-muted)]/80 mt-1 leading-snug">{hint}</p> : null}
    </div>
  );

  if (link) {
    return (
      <Link href={link} className="block hover:opacity-95 active:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
