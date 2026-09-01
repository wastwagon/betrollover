'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

const controlClass = (error?: string, className = '') =>
  [
    'w-full min-w-0 rounded-[var(--radius)] border bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-tertiary)] transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-1 focus:ring-offset-[var(--bg)]',
    'disabled:cursor-not-allowed disabled:bg-[var(--fill-secondary)] disabled:text-[var(--text-muted)]',
    error ? 'border-[var(--destructive)]' : 'border-[var(--border)]',
    className,
  ]
    .filter(Boolean)
    .join(' ');

/** Shared field chrome for native <select> so it matches Input. */
export function fieldControlClassName(error?: string, className = '') {
  return controlClass(error, className);
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0 w-full">
      {label ? (
        <label htmlFor={htmlFor} className="text-xs font-medium text-[var(--text-muted)]">
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <span className="text-xs text-[var(--destructive)]">{error}</span>
      ) : hint ? (
        <span className="text-xs text-[var(--text-tertiary)]">{hint}</span>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, className = '', id, ...rest }, ref) => {
    const inputId = id || (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
    return (
      <Field label={label} hint={hint} error={error} htmlFor={inputId}>
        <input ref={ref} id={inputId} className={controlClass(error, className)} {...rest} />
      </Field>
    );
  },
);

Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, className = '', id, ...rest }, ref) => {
    const inputId = id || (label ? `textarea-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
    return (
      <Field label={label} hint={hint} error={error} htmlFor={inputId}>
        <textarea
          ref={ref}
          id={inputId}
          className={controlClass(error, `resize-y ${className}`)}
          {...rest}
        />
      </Field>
    );
  },
);

Textarea.displayName = 'Textarea';
