'use client';

import { useT } from '@/context/LanguageContext';

/**
 * Human tipster with a verified account (email/identity gate on the platform).
 * Not shown for AI tipsters (they use AiTipsterBadge instead).
 */
export function VerifiedTipsterBadge({ className = '' }: { className?: string }) {
  const t = useT();
  return (
    <span
      className={`inline-flex items-center shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-sky-100 text-sky-900 border border-sky-200/80 dark:bg-sky-950/50 dark:text-sky-200 dark:border-sky-700/50 ${className}`}
      title={t('tipster.verified_badge_title')}
      aria-label={t('tipster.verified_badge_aria')}
    >
      {t('tipster.verified_badge')}
    </span>
  );
}
