'use client';

import { useT } from '@/context/LanguageContext';

/**
 * Platform AI tipster indicator (admin-operated). Shown next to display name; does not change listing order.
 */
export function AiTipsterBadge({ className = '' }: { className?: string }) {
  const t = useT();
  return (
    <span
      className={`inline-flex items-center shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-violet-100 text-violet-800 border border-violet-200/80 dark:bg-violet-950/60 dark:text-violet-200 dark:border-violet-700/50 ${className}`}
      title={t('tipster.ai_badge_title')}
      aria-label={t('tipster.ai_badge_aria')}
    >
      AI
    </span>
  );
}
