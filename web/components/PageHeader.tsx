'use client';

/**
 * Page header — `ios` variant uses large-title style; `marketing` keeps gradient hero.
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
  if (variant === 'marketing') {
    return (
      <div className="relative mb-6 sm:mb-8 w-full min-w-0 max-w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 shadow-xl shadow-teal-900/20">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5" aria-hidden />
        <div className="relative px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-w-0">
          <div className="min-w-0 max-w-full flex-1">
            <p className="text-teal-200/90 text-xs font-medium uppercase tracking-widest mb-0.5 truncate">{label}</p>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight min-w-0 break-words">{title}</h1>
            {tagline && (
              <p className="text-white/80 mt-1 text-sm sm:text-base max-w-full sm:max-w-xl min-w-0">{tagline}</p>
            )}
          </div>
          {action && (
            <div className="shrink-0 min-w-0 w-full sm:w-auto flex flex-wrap gap-2 justify-start sm:justify-end">{action}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5 sm:mb-6 w-full min-w-0 max-w-full flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div className="min-w-0 flex-1 px-0.5">
        {label && label !== title ? (
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-0.5 truncate">{label}</p>
        ) : null}
        <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight text-[var(--text)] leading-tight min-w-0 break-words">
          {title}
        </h1>
        {tagline ? (
          <p className="text-[15px] text-[var(--text-muted)] mt-1 max-w-full sm:max-w-xl leading-snug">{tagline}</p>
        ) : null}
      </div>
      {action ? (
        <div className="shrink-0 min-w-0 w-full sm:w-auto flex flex-wrap gap-2">{action}</div>
      ) : null}
    </div>
  );
}
