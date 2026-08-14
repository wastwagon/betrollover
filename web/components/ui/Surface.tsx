import type { HTMLAttributes, ReactNode } from 'react';

export type SurfaceVariant = 'flat' | 'raised' | 'inset' | 'interactive';

const variantClass: Record<SurfaceVariant, string> = {
  flat: 'bg-[var(--card)] border border-[var(--separator)]',
  raised: 'bg-[var(--card-elevated)] border border-[var(--separator)] shadow-card',
  inset: 'bg-[var(--fill-secondary)] border border-transparent',
  interactive:
    'bg-[var(--card)] border border-[var(--separator)] hover:border-[var(--primary)]/35 transition-colors',
};

export type SurfaceProps = HTMLAttributes<HTMLDivElement> & {
  variant?: SurfaceVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children?: ReactNode;
};

const padClass = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6 md:p-8',
} as const;

export function Surface({
  variant = 'flat',
  padding = 'md',
  className = '',
  children,
  ...rest
}: SurfaceProps) {
  return (
    <div
      className={[
        'rounded-[var(--radius)] min-w-0',
        variantClass[variant],
        padClass[padding],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
