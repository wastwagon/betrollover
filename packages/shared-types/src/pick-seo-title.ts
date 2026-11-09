/**
 * Public-facing pick titles for SEO, H1, and list link text.
 * Pattern: "[Home] vs [Away] Prediction: [Market] Tip, [D Mon YYYY]"
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export function formatPickKickoffDate(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (!Number.isFinite(d.getTime())) return null;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export type PickSeoTitleLeg = {
  homeTeam?: string | null;
  awayTeam?: string | null;
  matchDescription?: string | null;
  prediction?: string | null;
  outcomeKey?: string | null;
  matchDate?: Date | string | null;
};

function parseTeamsFromMatchDescription(desc: string | null | undefined): { home: string; away: string } | null {
  const raw = (desc || '').trim();
  if (!raw) return null;
  const parts = raw.split(/\s+vs\.?\s+/i);
  if (parts.length < 2) return null;
  const home = parts[0]?.trim();
  const away = parts.slice(1).join(' vs ').trim();
  if (!home || !away) return null;
  return { home, away };
}

function marketLabelFromLeg(leg: PickSeoTitleLeg): string {
  const pred = (leg.prediction || '').trim();
  if (pred && pred !== '—' && !/^selection\s+\d+$/i.test(pred)) return pred;
  const key = (leg.outcomeKey || '').trim();
  return key || 'Tip';
}

/**
 * Build "[Home] vs [Away] Prediction: [Market] Tip, [D Mon YYYY]".
 * Falls back to null when teams are missing so callers can keep an existing title.
 */
export function buildPickSeoTitle(legs: PickSeoTitleLeg[]): string | null {
  const list = Array.isArray(legs) ? legs.filter(Boolean) : [];
  if (list.length === 0) return null;

  const first = list[0];
  const fromFields =
    first.homeTeam?.trim() && first.awayTeam?.trim()
      ? { home: first.homeTeam.trim(), away: first.awayTeam.trim() }
      : parseTeamsFromMatchDescription(first.matchDescription);
  if (!fromFields) return null;

  const market = marketLabelFromLeg(first);
  const dateStr =
    formatPickKickoffDate(first.matchDate) ||
    list.map((l) => formatPickKickoffDate(l.matchDate)).find(Boolean) ||
    null;

  const base = `${fromFields.home} vs ${fromFields.away} Prediction: ${market} Tip`;
  return dateStr ? `${base}, ${dateStr}` : base;
}

/** True for legacy AI titles like "Single (2026-11-10) #4094". */
export function isLegacyGenericPickTitle(title: string | null | undefined): boolean {
  const t = (title || '').trim();
  if (!t) return true;
  return /^(Single|2-Pick Acca)(\s*\(|$)/i.test(t) || /^Pick\s*#?\d+$/i.test(t);
}
