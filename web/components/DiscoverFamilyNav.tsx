'use client';

import Link from 'next/link';
import { useT } from '@/context/LanguageContext';
import type { TranslationKey } from '@/lib/translations/en';

export type DiscoverJob = 'hub' | 'learn' | 'news' | 'guides';

const JOBS: { id: DiscoverJob; href: string; labelKey: TranslationKey; shortKey: TranslationKey }[] = [
  { id: 'hub', href: '/discover', labelKey: 'discover.job_hub', shortKey: 'discover.job_hub_short' },
  { id: 'learn', href: '/learn', labelKey: 'discover.job_learn', shortKey: 'discover.job_learn_short' },
  { id: 'news', href: '/news', labelKey: 'discover.job_news', shortKey: 'discover.job_news_short' },
  { id: 'guides', href: '/guides', labelKey: 'discover.job_guides', shortKey: 'discover.job_guides_short' },
];

/**
 * Education URLs stay separate (SEO). This nav only labels the job on each fold.
 */
export function DiscoverFamilyNav({ current }: { current: DiscoverJob }) {
  const t = useT();

  return (
    <nav className="ios-segmented w-full max-w-lg mb-4 sm:mb-5" aria-label={t('discover.family_label')}>
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
