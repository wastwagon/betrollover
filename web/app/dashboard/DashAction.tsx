'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

export function DashAction({
  href,
  badge,
  title,
  desc,
  primary,
  overlay,
}: {
  href: string;
  badge: string;
  title: string;
  desc: ReactNode;
  primary?: boolean;
  overlay?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        primary
          ? 'group flex items-center gap-4 p-4 sm:p-5 md:p-6 min-h-[72px] sm:min-h-0 rounded-[var(--radius)] bg-[var(--primary)] text-white transition-colors'
          : 'group flex items-center gap-4 p-4 sm:p-5 md:p-6 min-h-[72px] sm:min-h-0 rounded-[var(--radius)] border border-[var(--separator)] bg-[var(--card)] hover:border-[var(--primary)]/35 transition-colors'
      }
    >
      <span
        className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xs sm:text-sm font-semibold flex-shrink-0 ${
          primary ? 'bg-white/15' : 'bg-[var(--fill-secondary)] text-[var(--text-muted)]'
        }`}
      >
        {badge}
        {overlay}
      </span>
      <div className="min-w-0">
        <span className={`font-semibold block ${primary ? 'text-white' : 'text-[var(--text)]'}`}>{title}</span>
        <span className={`text-sm ${primary ? 'text-white/85' : 'text-[var(--text-muted)]'}`}>{desc}</span>
      </div>
    </Link>
  );
}
