'use client';

import Link from 'next/link';
import { useT } from '@/context/LanguageContext';
import type { TranslationKey } from '@/lib/translations/en';

export type AccaJob = 'buy' | 'build' | 'climb';

const JOBS: { id: AccaJob; href: string; labelKey: TranslationKey; shortKey: TranslationKey }[] = [
  { id: 'buy', href: '/marketplace', labelKey: 'acca.job_buy', shortKey: 'acca.job_buy_short' },
  { id: 'build', href: '/acca-generator', labelKey: 'acca.job_build', shortKey: 'acca.job_build_short' },
  { id: 'climb', href: '/rollover', labelKey: 'acca.job_climb', shortKey: 'acca.job_climb_short' },
];

/**
 * Three Acca products stay separate. This nav only labels the job on each fold.
 */
export function AccaFamilyNav({ current }: { current: AccaJob }) {
  const t = useT();

  return (
    <nav className="ios-segmented w-full max-w-md mb-4 sm:mb-5" aria-label={t('acca.family_label')}>
      {JOBS.map((job) => (
        <Link
          key={job.id}
          href={job.href}
          aria-label={t(job.labelKey)}
          aria-current={current === job.id ? 'page' : undefined}
          data-active={current === job.id ? 'true' : 'false'}
          className="ios-segmented-btn flex-1 touch-target inline-flex items-center justify-center no-underline"
        >
          {t(job.shortKey)}
        </Link>
      ))}
    </nav>
  );
}
