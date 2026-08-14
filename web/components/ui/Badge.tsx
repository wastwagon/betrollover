import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'primary' | 'accent' | 'success' | 'danger' | 'ai';

const toneClass: Record<BadgeTone, string> = {
  neutral:
    'bg-[var(--fill-secondary)] text-[var(--text-muted)] border border-[var(--separator)]',
  primary:
    'bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary)]/20',
  accent:
    'bg-[var(--accent-light)] text-[var(--accent)] border border-[var(--accent)]/25',
  success:
    'bg-[var(--success-light)] text-[var(--success)] border border-[var(--success)]/20',
  danger:
    'bg-red-50 text-red-700 border border-red-200/80 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/50',
  ai:
    'bg-[var(--primary-light)] text-[var(--primary-hover)] border border-[var(--primary)]/25',
};

export function Badge({
  children,
  tone = 'neutral',
  className = '',
  title,
  'aria-label': ariaLabel,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  title?: string;
  'aria-label'?: string;
}) {
  return (
    <span
      title={title}
      aria-label={ariaLabel}
      className={[
        'inline-flex items-center shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide',
        toneClass[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}
