'use client';

import { useT } from '@/context/LanguageContext';
import { Badge } from '@/components/ui/Badge';
import { isAccaDeskTipsterType } from '@/lib/tipster-kind';

/**
 * Classic 1-fixture AI indicator. Acca Desk is omitted so those tipsters read like the rest of the board.
 */
export function AiTipsterBadge({
  className = '',
  tipsterType,
}: {
  className?: string;
  tipsterType?: string | null;
}) {
  const t = useT();
  if (isAccaDeskTipsterType(tipsterType)) return null;
  return (
    <Badge
      tone="ai"
      className={className}
      title={t('tipster.ai_badge_title')}
      aria-label={t('tipster.ai_badge_aria')}
    >
      {t('tipster.ai_badge')}
    </Badge>
  );
}
