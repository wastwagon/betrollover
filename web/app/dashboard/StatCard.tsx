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
  const iconTone = {
    teal: 'text-[var(--primary)]',
    emerald: 'text-[var(--primary)]',
    amber: 'text-[var(--accent)]',
    slate: 'text-[var(--text-muted)]',
  };
  const iconLabel = (icon ?? (title.trim().charAt(0) || '?')).slice(0, 2).toUpperCase();
  const baseCard = `rounded-2xl border border-[var(--separator)] bg-[var(--card)] p-4 sm:p-5 min-w-0 transition-colors hover:bg-[var(--fill-secondary)]/35 ${
    glass ? '' : ''
  }`;
  const content = (
    <div className={baseCard}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3 min-w-0">
        <div
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-[11px] font-semibold shrink-0 bg-[var(--fill-secondary)] ${iconTone[variant]}`}
        >
          {iconLabel}
        </div>
        <span className="text-[22px] sm:text-[26px] font-semibold tracking-tight text-[var(--text)] tabular-nums truncate text-left sm:text-right sm:ml-auto">
          {display}
          {suffix}
        </span>
      </div>
      <p className="text-[13px] font-medium text-[var(--text-muted)] mt-2.5 sm:mt-3">{title}</p>
      {hint ? <p className="text-[11px] text-[var(--text-tertiary)] mt-1 leading-snug">{hint}</p> : null}
    </div>
  );

  if (link) {
    return (
      <Link href={link} className="block active:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
