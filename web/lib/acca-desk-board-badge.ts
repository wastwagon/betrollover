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

/**
 * Today / Tomorrow badge for Acca Desk marketplace cards.
 * Uses desk-day stamp in the title (not each leg’s calendar date).
 */
export function accaDeskBoardBadge(
  title: string | null | undefined,
  tipsterType?: string | null,
): AccaDeskBoardBadge | null {
  const desk = deskDayFromAccaTitle(title);
  if (!desk) return null;
  if (!isAccaDeskTipsterType(tipsterType) && !looksLikeAccaDeskTitle(title)) return null;
  const today = accraDateStr();
  if (desk === today) return 'today';
  if (desk === addDateStrDays(today, 1)) return 'tomorrow';
  return null;
}
