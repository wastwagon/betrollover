'use client';

/**
 * Page header — iOS large-title style with brand display type.
 * `marketing` is kept as an alias of the default for backwards compatibility.
 */
export function PageHeader({
  label,
  title,
  tagline,
  action,
  variant = 'ios',
}: {
  label: string;
  title: string;
  tagline?: string;
  action?: React.ReactNode;
  variant?: 'ios' | 'marketing';
}) {
  void variant;

  return (
    <div className="mb-4 sm:mb-6 w-full min-w-0 max-w-full flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-3">
      <div className="min-w-0 flex-1 px-0.5">
        {label && label !== title ? (
          <p className="hidden sm:block text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-[0.12em] mb-0.5 truncate">
            {label}
          </p>
        ) : null}
        <h1 className="font-display text-[22px] sm:text-[34px] font-semibold tracking-tight text-[var(--text)] leading-tight min-w-0 break-words">
          {title}
        </h1>
        {tagline ? (
          <p className="hidden sm:block text-[15px] text-[var(--text-muted)] mt-1 max-w-full sm:max-w-xl leading-snug">
            {tagline}
          </p>
        ) : null}
      </div>
      {action ? (
        <div className="shrink-0 min-w-0 w-full sm:w-auto flex flex-wrap gap-2">{action}</div>
      ) : null}
    </div>
  );
}
