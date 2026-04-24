import Link from 'next/link';

type EscrowTrustCalloutProps = {
  title: string;
  body: string;
  linkLabel: string;
  linkHref?: string;
  className?: string;
};

export function EscrowTrustCallout({
  title,
  body,
  linkLabel,
  linkHref = '/how-it-works#faq',
  className = '',
}: EscrowTrustCalloutProps) {
  return (
    <aside
      className={`rounded-2xl border border-emerald-200/70 dark:border-emerald-800/45 bg-emerald-50/50 dark:bg-emerald-900/15 px-4 py-3 sm:px-5 sm:py-3.5 min-w-0 ${className}`}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <span className="text-lg leading-none shrink-0" aria-hidden>
          🛡
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">{title}</p>
          <p className="text-xs sm:text-sm text-emerald-800/95 dark:text-emerald-300/95 leading-relaxed">{body}</p>
          <p className="pt-0.5">
            <Link
              href={linkHref}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline underline-offset-2"
            >
              {linkLabel}
            </Link>
          </p>
        </div>
      </div>
    </aside>
  );
}
