'use client';

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variantClass: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm disabled:opacity-50',
  secondary:
    'bg-[var(--card)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-50',
  ghost:
    'bg-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--fill-secondary)] disabled:opacity-50',
  destructive:
    'bg-[var(--destructive)] text-white hover:opacity-90 disabled:opacity-50',
  accent:
    'bg-[var(--accent)] text-white hover:brightness-95 shadow-sm disabled:opacity-50',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-[var(--radius-sm)] min-h-[36px]',
  md: 'px-4 py-2.5 text-sm rounded-[var(--radius)] min-h-[44px]',
  lg: 'px-5 py-3.5 text-base font-semibold rounded-[var(--radius)] min-h-[52px]',
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
};

/** Shared class string for Next.js `<Link>` CTAs that should match `Button`. */
export function buttonClassName({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className = '',
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}) {
  return [
    'inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-200 active:scale-[0.99] touch-manipulation',
    variantClass[variant],
    sizeClass[size],
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth,
      leading,
      trailing,
      className = '',
      children,
      type = 'button',
      ...rest
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={[
        'inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-200 active:scale-[0.99] disabled:cursor-not-allowed touch-manipulation',
        variantClass[variant],
        sizeClass[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {leading}
      {children}
      {trailing}
    </button>
  ),
);

Button.displayName = 'Button';
