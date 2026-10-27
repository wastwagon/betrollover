'use client';

import { useEffect, useState } from 'react';
import { useLanguage, useT } from '@/context/LanguageContext';
import { computeKickoffUrgency } from '@/lib/kickoff-urgency';
import { intlLocaleForLanguage } from '@/lib/intl-locale';

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
  const { lang } = useLanguage();
  const intlLocale = intlLocaleForLanguage(lang);
  /** Defer countdown until mount — server clock ≠ client clock (React #418). */
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (now === null) {
    return (
      <p
        className={`${compact ? 'text-[10px]' : 'text-[11px]'} font-medium tabular-nums text-[var(--text-muted)] ${className}`}
        aria-hidden
      >
        {'\u00a0'}
      </p>
    );
  }

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
    const when = new Date(urgency.earliestMs).toLocaleString(intlLocale, {
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
