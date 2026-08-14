'use client';

import { useT } from '@/context/LanguageContext';
import { Badge } from '@/components/ui/Badge';

/**
 * Platform AI tipster indicator (admin-operated). Shown next to display name; does not change listing order.
 */
export function AiTipsterBadge({ className = '' }: { className?: string }) {
  const t = useT();
  return (
    <Badge
      tone="ai"
      className={className}
      title={t('tipster.ai_badge_title')}
      aria-label={t('tipster.ai_badge_aria')}
    >
      AI
    </Badge>
  );
}
