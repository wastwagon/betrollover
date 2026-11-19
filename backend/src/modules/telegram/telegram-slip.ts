export type TelegramSlipLeg = {
  matchDescription?: string | null;
  prediction?: string | null;
  odds?: number | null;
  matchDate?: string | Date | null;
  result?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
};

export function telegramKickoffLabel(raw?: string | Date | null): string {
  if (!raw) return '';
  const d = raw instanceof Date ? raw : new Date(raw);
  if (!Number.isFinite(d.getTime())) return '';
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Accra',
  });
}

/**
 * SEO / card titles that list every fixture ("2-match pick: A vs B + C vs D, 20 Nov 2026").
 * When legs are printed below, that title only repeats the same names.
 */
export function isMatchListPickTitle(title: string | null | undefined): boolean {
  const t = (title || '').trim();
  if (!t) return false;
  if (/^\d+-match pick:/i.test(t)) return true;
  // Single-match SEO: "Home vs Away, 10 Nov 2026"
  if (/\bvs\.?\b/i.test(t) && /,\s*\d{1,2}\s+[A-Za-z]{3}(?:\s+\d{4})?\s*$/i.test(t)) {
    return true;
  }
  return false;
}

export function telegramLegsHaveCopy(legs?: TelegramSlipLeg[] | null): boolean {
  return (legs || []).some((leg) => {
    const match = (leg.matchDescription || '').trim();
    const pred = (leg.prediction || '').trim();
    return Boolean(match || pred);
  });
}

/** Prefer a short label when fixtures already appear as bullet legs. */
export function telegramHeadlineWhenLegsListed(
  title: string | null | undefined,
  fallback: string,
): string {
  const t = (title || '').trim();
  if (!t || isMatchListPickTitle(t)) return fallback;
  return t;
}

export function formatTelegramLegLine(leg: TelegramSlipLeg, mode: 'open' | 'settled' = 'open'): string {
  const match = (leg.matchDescription || '').trim();
  const pred = (leg.prediction || '').trim();
  if (!match && !pred) return '';
  const head = `${match}${match && pred ? ' — ' : ''}${pred}`;
  if (mode === 'settled') {
    const mark = (leg.result || 'won').toUpperCase();
    const score =
      leg.homeScore != null && leg.awayScore != null ? ` FT ${leg.homeScore}-${leg.awayScore}` : '';
    return `• ${head} · ${mark}${score}`;
  }
  const lo =
    leg.odds != null && Number.isFinite(Number(leg.odds)) ? ` @ ${Number(leg.odds).toFixed(2)}` : '';
  const when = telegramKickoffLabel(leg.matchDate);
  return `• ${head}${lo}${when ? ` · ${when}` : ''}`;
}
