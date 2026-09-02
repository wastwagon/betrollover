'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/context/LanguageContext';
import { computeKickoffUrgency } from '@/lib/kickoff-urgency';

type KickoffUrgencyLineProps = {
  picks: Array<{ matchDate?: string | Date | null }> | null | undefined;
  className?: string;
  compact?: boolean;
};

/**
 * Live-updating countdown to the earliest selection kickoff.
 */
export function KickoffUrgencyLine({ picks, className = '', compact = false }: KickoffUrgencyLineProps) {
  const t = useT();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const urgency = computeKickoffUrgency(picks, now);
  if (!urgency) return null;

  let text: string;
  if (urgency.labelKey === 'started') {
    text = t('kickoff.started');
  } else if (urgency.labelKey === 'soon') {
    text = t('kickoff.soon', {
      h: String(urgency.hours),
      m: String(urgency.minutes),
    });
  } else if (urgency.labelKey === 'today') {
    text = t('kickoff.today', {
      h: String(urgency.hours),
      m: String(urgency.minutes),
    });
  } else {
    const when = new Date(urgency.earliestMs).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    text = t('kickoff.later', { when });
  }

  const tone =
    urgency.labelKey === 'soon' ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]';

  return (
    <p
      className={`${compact ? 'text-[10px]' : 'text-[11px]'} font-medium tabular-nums ${tone} ${className}`}
      title={text}
    >
      {text}
    </p>
  );
}
