'use client';

import { useT } from '@/context/LanguageContext';
import { Badge } from '@/components/ui/Badge';
import { isAccaDeskTipsterType } from '@/lib/tipster-kind';

/**
 * Platform-operated tipsters: classic AI + Acca Desk automations.
 * Acca Desk uses an "Automated" label so it is clear these are not human sellers.
 */
export function AiTipsterBadge({
  className = '',
  tipsterType,
}: {
  className?: string;
  tipsterType?: string | null;
}) {
  const t = useT();
  const automated = isAccaDeskTipsterType(tipsterType);
  return (
    <Badge
      tone="ai"
      className={className}
      title={automated ? t('tipster.automated_badge_title') : t('tipster.ai_badge_title')}
      aria-label={automated ? t('tipster.automated_badge_aria') : t('tipster.ai_badge_aria')}
    >
      {automated ? t('tipster.automated_badge') : t('tipster.ai_badge')}
    </Badge>
  );
}
