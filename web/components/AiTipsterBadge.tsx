'use client';

import { useT } from '@/context/LanguageContext';
import { Badge } from '@/components/ui/Badge';

/**
 * Platform-operated tipsters (classic AI + Acca Desk). Public label is always "AI tipster".
 */
export function AiTipsterBadge({
  className = '',
  tipsterType: _tipsterType,
}: {
  className?: string;
  tipsterType?: string | null;
}) {
  const t = useT();
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
