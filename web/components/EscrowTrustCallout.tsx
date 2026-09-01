import Link from 'next/link';
import { IconShield } from '@/components/ios/icons';

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
      className={`rounded-2xl border border-[var(--primary)]/25 bg-[var(--primary-light)] px-4 py-3 sm:px-5 sm:py-3.5 min-w-0 ${className}`}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <IconShield className="w-5 h-5 shrink-0 text-[var(--primary)] mt-0.5" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-bold text-[var(--primary)]">{title}</p>
          <p className="text-xs sm:text-sm text-[var(--text)] leading-relaxed">{body}</p>
          <p className="pt-0.5">
            <Link
              href={linkHref}
              className="text-xs font-semibold text-[var(--primary)] hover:underline underline-offset-2"
            >
              {linkLabel}
            </Link>
          </p>
        </div>
      </div>
    </aside>
  );
}
