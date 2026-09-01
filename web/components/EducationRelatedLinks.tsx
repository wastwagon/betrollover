'use client';

import Link from 'next/link';
import { useT } from '@/context/LanguageContext';
import type { TranslationKey } from '@/lib/translations/en';

export type EducationFold =
  | 'learn'
  | 'guides'
  | 'escrow'
  | 'evaluate'
  | 'news'
  | 'library'
  | 'how-it-works';

const LINKS: { id: EducationFold; href: string; labelKey: TranslationKey }[] = [
  { id: 'guides', href: '/guides', labelKey: 'discover.job_guides_short' },
  { id: 'learn', href: '/learn', labelKey: 'nav.learn' },
  { id: 'escrow', href: '/guides/escrow-refunds', labelKey: 'guides.escrow_short' },
  { id: 'evaluate', href: '/guides/evaluate-tipsters', labelKey: 'guides.eval_short' },
  { id: 'news', href: '/news', labelKey: 'nav.news' },
  { id: 'library', href: '/resources', labelKey: 'education.library' },
  { id: 'how-it-works', href: '/how-it-works', labelKey: 'learn.cta_how_it_works' },
];

/**
 * Sibling education links. URLs stay split (SEO). Do not replace DiscoverFamilyNav.
 */
export function EducationRelatedLinks({ current }: { current: EducationFold }) {
  const t = useT();
  const shown = LINKS.filter((link) => {
    if (link.id === current) return false;
    if (current === 'guides' && (link.id === 'escrow' || link.id === 'evaluate')) return false;
    return true;
  });

  return (
    <nav className="mb-6" aria-label={t('education.also')}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
        {t('education.also')}
      </p>
      <div className="flex flex-wrap gap-2">
        {shown.map((link) => (
          <Link
            key={link.id}
            href={link.href}
            className="inline-flex items-center px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--text)] hover:border-[var(--primary)]/50 hover:text-[var(--primary)] transition-colors no-underline"
          >
            {t(link.labelKey)}
          </Link>
        ))}
      </div>
    </nav>
  );
}
