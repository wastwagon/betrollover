import { isAccaDeskTipsterType } from '@/lib/tipster-kind';

/** Accra calendar YYYY-MM-DD (Accra has no DST; equals UTC date). */
export function accraDateStr(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Accra',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function addDateStrDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Parse desk-day stamp from Acca Desk title `… · YYYY-MM-DD`. */
export function deskDayFromAccaTitle(title: string | null | undefined): string | null {
  if (!title) return null;
  const m = title.match(/·\s*(\d{4}-\d{2}-\d{2})\s*$/);
  return m?.[1] ?? null;
}

/** Acca Desk title shape when tipsterType is missing on a card payload. */
export function looksLikeAccaDeskTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  return /·\s*(Early|Afternoon|Evening|Midnight)\s*·\s*2-fold\s*@/i.test(title);
}

export type AccaDeskBoardBadge = 'today' | 'tomorrow';

function isAccaDeskCard(title: string | null | undefined, tipsterType?: string | null): boolean {
  return isAccaDeskTipsterType(tipsterType) || looksLikeAccaDeskTitle(title);
}

function badgeForDate(dateStr: string | null, today: string, tomorrow: string): AccaDeskBoardBadge | null {
  if (!dateStr) return null;
  if (dateStr === today) return 'today';
  if (dateStr === tomorrow) return 'tomorrow';
  return null;
}

/**
 * Today / Tomorrow badge for Acca Desk cards.
 * Prefer earliest kickoff Accra date so overnight Midnight legs (e.g. 05:00 next
 * calendar day) read as Tomorrow during the afternoon — matching user expectation
 * and marketplace Today/Tomorrow filters. Fall back to the title desk-day stamp
 * when picks have no kickoff times.
 */
export function accaDeskBoardBadge(
  title: string | null | undefined,
  tipsterType?: string | null,
  picks?: Array<{ matchDate?: string | Date | null }> | null,
  now: Date = new Date(),
): AccaDeskBoardBadge | null {
  if (!isAccaDeskCard(title, tipsterType)) return null;

  const today = accraDateStr(now);
  const tomorrow = addDateStrDays(today, 1);

  const fromKick = badgeForDate(earliestKickoffAccraDate(picks), today, tomorrow);
  if (fromKick) return fromKick;

  return badgeForDate(deskDayFromAccaTitle(title), today, tomorrow);
}

export type MarketplaceDayFilter = 'all' | 'today' | 'tomorrow';

/** Earliest leg kickoff as Accra YYYY-MM-DD. */
export function earliestKickoffAccraDate(
  picks: Array<{ matchDate?: string | Date | null }> | null | undefined,
): string | null {
  if (!picks?.length) return null;
  let earliest: number | null = null;
  for (const p of picks) {
    if (!p.matchDate) continue;
    const t = p.matchDate instanceof Date ? p.matchDate.getTime() : new Date(p.matchDate).getTime();
    if (!Number.isFinite(t)) continue;
    if (earliest == null || t < earliest) earliest = t;
  }
  return earliest == null ? null : accraDateStr(new Date(earliest));
}

/**
 * Marketplace day filter: Acca Desk board badge (kickoff, else desk day), else earliest kickoff.
 */
export function matchesMarketplaceDayFilter(
  dayFilter: MarketplaceDayFilter,
  opts: {
    title?: string | null;
    tipsterType?: string | null;
    picks?: Array<{ matchDate?: string | Date | null }> | null;
  },
  now: Date = new Date(),
): boolean {
  if (dayFilter === 'all') return true;
  const badge = accaDeskBoardBadge(opts.title, opts.tipsterType, opts.picks, now);
  if (badge) return badge === dayFilter;
  const kick = earliestKickoffAccraDate(opts.picks);
  if (!kick) return false;
  const today = accraDateStr(now);
  if (dayFilter === 'today') return kick === today;
  return kick === addDateStrDays(today, 1);
}
