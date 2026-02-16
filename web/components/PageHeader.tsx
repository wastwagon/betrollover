'use client';

/**
 * Reusable premium page header: gradient banner with small label, main heading, and optional tagline.
 * Matches the Tipster Dashboard header design. Keep compact and mobile-first.
 */
export function PageHeader({
  label,
  title,
  tagline,
  action,
}: {
  label: string;
  title: string;
  tagline?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="relative mb-6 sm:mb-8 overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 shadow-xl shadow-teal-900/20">
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5" aria-hidden />
      <div className="relative px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <p className="text-teal-200/90 text-xs font-medium uppercase tracking-widest mb-0.5">{label}</p>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">{title}</h1>
          {tagline && (
            <p className="text-white/80 mt-1 text-sm sm:text-base max-w-xl">{tagline}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}
