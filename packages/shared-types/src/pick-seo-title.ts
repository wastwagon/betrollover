/**
 * Public-facing pick titles for SEO, H1, list link text and share copy.
 *
 * Multi-match: "2-match pick: [Home1] vs [Away1] + [Home2] vs [Away2], [D Mon YYYY]"
 * Single: "[Home] vs [Away], [D Mon YYYY]"
 *
 * Publishers may append a machine stamp " · YYYY-MM-DD" (desk day) and/or " · #id".
 * Strip those for display with stripPickTitleMachineStamp / displayPickTitle.
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

function teamsFromLeg(leg: PickSeoTitleLeg): { home: string; away: string } | null {
  if (leg.homeTeam?.trim() && leg.awayTeam?.trim()) {
    return { home: leg.homeTeam.trim(), away: leg.awayTeam.trim() };
  }
  return parseTeamsFromMatchDescription(leg.matchDescription);
}

/** Remove desk-day ISO stamp and prediction-id suffix for public display. */
export function stripPickTitleMachineStamp(title: string | null | undefined): string {
  let t = (title || '').trim();
  if (!t) return '';
  t = t.replace(/\s·\s#\d+\s*$/u, '').trim();
  t = t.replace(/\s·\s\d{4}-\d{2}-\d{2}\s*$/u, '').trim();
  return t;
}

/**
 * Build public SEO title from legs.
 * Falls back to null when teams are missing so callers can keep an existing title.
 */
export function buildPickSeoTitle(legs: PickSeoTitleLeg[]): string | null {
  const list = Array.isArray(legs) ? legs.filter(Boolean) : [];
  if (list.length === 0) return null;

  const pairs: { home: string; away: string }[] = [];
  for (const leg of list) {
    const teams = teamsFromLeg(leg);
    if (!teams) continue;
    pairs.push(teams);
  }
  if (pairs.length === 0) return null;

  const dateStr =
    list.map((l) => formatPickKickoffDate(l.matchDate)).find(Boolean) || null;

  if (pairs.length === 1) {
    const base = `${pairs[0].home} vs ${pairs[0].away}`;
    return dateStr ? `${base}, ${dateStr}` : base;
  }

  const matchList = pairs.map((p) => `${p.home} vs ${p.away}`).join(' + ');
  const n = pairs.length;
  const base = `${n}-match pick: ${matchList}`;
  return dateStr ? `${base}, ${dateStr}` : base;
}

/**
 * Prefer SEO title from legs; otherwise strip machine stamps from stored title.
 * Replaces legacy desk / generic titles when legs are available.
 */
export function displayPickTitle(
  storedTitle: string | null | undefined,
  legs: PickSeoTitleLeg[],
): string {
  const seo = buildPickSeoTitle(legs);
  const stored = stripPickTitleMachineStamp(storedTitle);
  if (seo && (!stored || isLegacyGenericPickTitle(storedTitle) || isLegacyGenericPickTitle(stored))) {
    return seo;
  }
  if (seo && stored.includes('· #')) return seo;
  return stored || seo || 'Football pick';
}

/** True for legacy AI / Acca Desk titles that should not be shown publicly. */
export function isLegacyGenericPickTitle(title: string | null | undefined): boolean {
  const t = (title || '').trim();
  if (!t) return true;
  if (/^(Single|2-Pick Acca)(\s*\(|$)/i.test(t)) return true;
  if (/^Pick\s*#?\d+$/i.test(t)) return true;
  // Desk / publisher stamps: "… · Early · 2-fold @ 2.37 · 2026-11-10"
  if (/\b2-fold\s*@/i.test(t)) return true;
  if (/·\s*(Early|Afternoon|Evening|Midnight)\s*·/i.test(t)) return true;
  // Old "Safe · Mixed Markets · …" / "Sure · 1X2 · …" risk·market labels
  if (/^(Sure|Safe|Medium|High|Low Odds|Medium Odds|High Odds)\s*·/i.test(t) && /·/.test(t)) {
    return true;
  }
  return false;
}
