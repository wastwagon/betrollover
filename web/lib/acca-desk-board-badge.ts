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
 * Prefer desk-day stamp in the title; if that day has already rolled past Accra
 * (common for Midnight 23:00→05:59 spillover), fall back to earliest kickoff Accra date.
 */
export function accaDeskBoardBadge(
  title: string | null | undefined,
  tipsterType?: string | null,
  picks?: Array<{ matchDate?: string | Date | null }> | null,
): AccaDeskBoardBadge | null {
  if (!isAccaDeskCard(title, tipsterType)) return null;

  const today = accraDateStr();
  const tomorrow = addDateStrDays(today, 1);

  const fromDesk = badgeForDate(deskDayFromAccaTitle(title), today, tomorrow);
  if (fromDesk) return fromDesk;

  // Yesterday’s Midnight board (and any lingering desk day) still kicking today/tomorrow.
  return badgeForDate(earliestKickoffAccraDate(picks), today, tomorrow);
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
 * Marketplace day filter: Acca Desk board badge (desk day, else kickoff), else earliest kickoff.
 */
export function matchesMarketplaceDayFilter(
  dayFilter: MarketplaceDayFilter,
  opts: {
    title?: string | null;
    tipsterType?: string | null;
    picks?: Array<{ matchDate?: string | Date | null }> | null;
  },
): boolean {
  if (dayFilter === 'all') return true;
  const badge = accaDeskBoardBadge(opts.title, opts.tipsterType, opts.picks);
  if (badge) return badge === dayFilter;
  const kick = earliestKickoffAccraDate(opts.picks);
  if (!kick) return false;
  const today = accraDateStr();
  if (dayFilter === 'today') return kick === today;
  return kick === addDateStrDays(today, 1);
}
