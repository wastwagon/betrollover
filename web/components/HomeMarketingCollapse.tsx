'use client';

import { useState, type ReactNode } from 'react';
import { useT } from '@/context/LanguageContext';

/** Collapses long how-it-works / features blocks so discovery stays first. */
export function HomeMarketingCollapse({
  summary,
  children,
  defaultOpen = false,
}: {
  summary: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="border-t border-[var(--border)] w-full min-w-0 max-w-full overflow-x-hidden">
      <div className="section-ux-cap-4xl w-full min-w-0 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="touch-target w-full flex items-center justify-between gap-3 rounded-2xl border border-[var(--separator)] bg-[var(--card)] px-4 py-3.5 text-left hover:bg-[var(--fill-secondary)] transition-colors"
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-[var(--text)]">{summary}</span>
            <span className="block text-xs text-[var(--text-muted)] mt-0.5">
              {open ? t('common.close') : t('common.learn_more')}
            </span>
          </span>
          <svg
            className={`w-5 h-5 shrink-0 text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      {open ? <div className="pb-4 sm:pb-8">{children}</div> : null}
    </section>
  );
}
