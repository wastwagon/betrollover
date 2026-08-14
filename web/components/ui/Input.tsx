'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, className = '', id, ...rest }, ref) => {
    const inputId = id || (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
    return (
      <label className="flex flex-col gap-1.5 min-w-0 w-full">
        {label ? (
          <span className="text-xs font-medium text-[var(--text-muted)]">{label}</span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={[
            'w-full min-w-0 rounded-[var(--radius)] border bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-tertiary)] transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-1 focus:ring-offset-[var(--bg)]',
            error ? 'border-[var(--destructive)]' : 'border-[var(--border)]',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...rest}
        />
        {error ? (
          <span className="text-xs text-[var(--destructive)]">{error}</span>
        ) : hint ? (
          <span className="text-xs text-[var(--text-tertiary)]">{hint}</span>
        ) : null}
      </label>
    );
  },
);

Input.displayName = 'Input';
