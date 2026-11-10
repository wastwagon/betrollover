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
          ? 'group flex items-center gap-3.5 p-4 min-h-[72px] sm:min-h-0 rounded-2xl bg-[var(--primary)] text-white transition-opacity hover:opacity-95'
          : 'group flex items-center gap-3.5 p-4 min-h-[72px] sm:min-h-0 rounded-2xl border border-[var(--separator)] bg-[var(--card)] transition-colors hover:bg-[var(--fill-secondary)]/40'
      }
    >
      <span
        className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-[11px] font-semibold tracking-wide flex-shrink-0 ${
          primary ? 'bg-white/15' : 'bg-[var(--fill-secondary)] text-[var(--text-muted)]'
        }`}
      >
        {badge.slice(0, 4)}
        {overlay}
      </span>
      <div className="min-w-0">
        <span className={`font-semibold block text-[15px] tracking-tight ${primary ? 'text-white' : 'text-[var(--text)]'}`}>
          {title}
        </span>
        <span className={`text-[13px] leading-snug ${primary ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>{desc}</span>
      </div>
    </Link>
  );
}
