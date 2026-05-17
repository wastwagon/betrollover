'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconChevronLeft } from './icons';

export interface NavBarProps {
  title: string;
  /** Falls back to router.back() */
  backHref?: string;
  backLabel?: string;
  right?: React.ReactNode;
  className?: string;
  sticky?: boolean;
}

export function NavBar({
  title,
  backHref,
  backLabel = 'Back',
  right,
  className = '',
  sticky = true,
}: NavBarProps) {
  const router = useRouter();

  const backControl = backHref ? (
    <Link
      href={backHref}
      className="touch-target inline-flex items-center gap-0.5 -ml-2 px-2 py-1.5 text-[var(--primary)] font-medium text-[15px] hover:opacity-80 transition-opacity"
    >
      <IconChevronLeft className="w-5 h-5" />
      <span className="sr-only sm:not-sr-only sm:inline">{backLabel}</span>
    </Link>
  ) : (
    <button
      type="button"
      onClick={() => router.back()}
      className="touch-target inline-flex items-center gap-0.5 -ml-2 px-2 py-1.5 text-[var(--primary)] font-medium text-[15px] hover:opacity-80 transition-opacity"
    >
      <IconChevronLeft className="w-5 h-5" />
      <span className="sr-only sm:not-sr-only sm:inline">{backLabel}</span>
    </button>
  );

  return (
    <header
      className={`${sticky ? 'sticky top-0 z-40' : ''} ios-chrome border-b w-full min-w-0 ${className}`}
    >
      <div className="flex items-center justify-between gap-2 min-h-[44px] px-3 sm:px-4 max-w-6xl mx-auto">
        <div className="min-w-[4.5rem] flex items-center">{backControl}</div>
        <h1 className="flex-1 text-center text-[17px] font-semibold text-[var(--text)] truncate px-1">
          {title}
        </h1>
        <div className="min-w-[4.5rem] flex items-center justify-end">{right ?? <span className="w-6" aria-hidden />}</div>
      </div>
    </header>
  );
}
