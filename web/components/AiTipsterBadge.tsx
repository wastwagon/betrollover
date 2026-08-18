'use client';

import { useT } from '@/context/LanguageContext';
import { Badge } from '@/components/ui/Badge';
import { isAccaDeskTipsterType } from '@/lib/tipster-kind';

/**
 * Platform-operated tipster indicator. Acca Desk vs classic 1-fixture AI.
 * Does not change listing order.
 */
export function AiTipsterBadge({
  className = '',
  tipsterType,
}: {
  className?: string;
  tipsterType?: string | null;
}) {
  const t = useT();
  const desk = isAccaDeskTipsterType(tipsterType);
  return (
    <Badge
      tone="ai"
      className={className}
      title={desk ? t('tipster.acca_desk_badge_title') : t('tipster.ai_badge_title')}
      aria-label={desk ? t('tipster.acca_desk_badge_aria') : t('tipster.ai_badge_aria')}
    >
      {desk ? t('tipster.acca_desk_badge') : t('tipster.ai_badge')}
    </Badge>
  );
}
