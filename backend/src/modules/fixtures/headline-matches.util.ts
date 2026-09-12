const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN', 'CANC', 'PST', 'ABD', 'AWD', 'WO']);
const NOT_STARTED_STATUSES = new Set(['NS', 'TBD']);

/**
 * Home-rail priority by API-Football league id (higher = prefer).
 * Ghana-first product: GPL + AFCON sit with Europe's elite; obscure live leagues stay low.
 */
const HEADLINE_LEAGUE_API_IDS: Readonly<Record<number, number>> = {
  // UEFA club competitions
  2: 100, // Champions League
  3: 95, // Europa League
  848: 90, // Conference League
  // Big 5
  39: 88, // Premier League (England)
  140: 86, // La Liga
  135: 84, // Serie A
  78: 82, // Bundesliga
  61: 80, // Ligue 1
  // Continental / World
  1: 98, // World Cup
  4: 94, // Euro
  5: 93, // Africa Cup of Nations
  // Ghana + Africa (platform home market)
  570: 92, // Ghana Premier League
  1144: 72, // Ghana Super Cup
  399: 74, // Nigeria NPFL
  233: 72, // Egypt Premier League
  288: 70, // South Africa PSL
  200: 68, // Morocco Botola Pro
  403: 64, // Senegal Ligue 1
  386: 62, // Ivory Coast Ligue 1
  276: 60, // Kenya FKF Premier League
  // Strong cups / peers Ghana audience still follows
  45: 76, // FA Cup
  48: 70, // EFL Cup
  66: 68, // Coupe de France
  81: 68, // DFB Pokal
  137: 68, // Coppa Italia
  143: 68, // Copa del Rey
  94: 58, // Primeira Liga
  88: 56, // Eredivisie
  203: 54, // Süper Lig
  144: 52, // Belgian Pro League
  179: 50, // Scottish Premiership
  71: 48, // Brazil Serie A
  253: 46, // MLS
  262: 44, // Liga MX (first team — youth demoted by name)
  307: 42, // Saudi Pro League
};

/** Name fragments when api id is missing (avoid bare "premier league" — many countries share it). */
const HEADLINE_NAME_HINTS: ReadonlyArray<{ frag: string; boost: number }> = [
  { frag: 'champions league', boost: 100 },
  { frag: 'world cup', boost: 98 },
  { frag: 'europa league', boost: 95 },
  { frag: 'africa cup', boost: 93 },
  { frag: 'african nations', boost: 93 },
  { frag: 'conference league', boost: 90 },
  { frag: 'english premier', boost: 88 },
  { frag: 'la liga', boost: 86 },
  { frag: 'serie a', boost: 84 },
  { frag: 'bundesliga', boost: 82 },
  { frag: 'ligue 1', boost: 80 },
  { frag: 'fa cup', boost: 76 },
  { frag: 'npfl', boost: 74 },
  { frag: 'botola', boost: 68 },
  { frag: 'copa del rey', boost: 68 },
  { frag: 'dfb-pokal', boost: 68 },
  { frag: 'dfb pokal', boost: 68 },
];

/** Youth / secondary competitions that should almost never headline the home rail. */
const DEMOTE_NAME_HINTS = [
  'u21',
  'u19',
  'u23',
  'youth',
  'reserve',
  'primera b',
  'liga mx u',
  'nwsl',
  'wpsl',
  'friendlies',
];

export interface HeadlineMatchRow {
  id: number;
  apiId: number;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
  leagueName: string | null;
  leagueApiId: number | null;
  matchDate: string;
  status: string;
  statusElapsed: number | null;
  homeScore: number | null;
  awayScore: number | null;
}

export function isFixtureLive(status: string): boolean {
  const s = status.trim().toUpperCase();
  return !FINISHED_STATUSES.has(s) && !NOT_STARTED_STATUSES.has(s);
}

export function isDemotedHeadlineLeague(leagueName: string | null | undefined): boolean {
  const n = (leagueName || '').toLowerCase();
  if (!n) return false;
  return DEMOTE_NAME_HINTS.some((frag) => n.includes(frag));
}

/** 0 = not a home-rail competition; higher = prefer. */
export function leagueBoost(leagueName: string | null, leagueApiId?: number | null): number {
  if (isDemotedHeadlineLeague(leagueName)) return 0;
  if (leagueApiId != null && HEADLINE_LEAGUE_API_IDS[leagueApiId] != null) {
    return HEADLINE_LEAGUE_API_IDS[leagueApiId];
  }
  const n = (leagueName || '').toLowerCase();
  for (const { frag, boost } of HEADLINE_NAME_HINTS) {
    if (n.includes(frag)) return boost;
  }
  return 0;
}

/**
 * Live obscure football must not bury Ghana / big leagues.
 * Live boost only for headline leagues; demoted live is penalised.
 */
export function matchScore(m: HeadlineMatchRow, now: number): number {
  const boost = leagueBoost(m.leagueName, m.leagueApiId);
  const demoted = isDemotedHeadlineLeague(m.leagueName);
  const live = isFixtureLive(m.status);
  const liveBonus = live ? (boost > 0 ? 400 : demoted ? -600 : 40) : 0;
  const kickoff = new Date(m.matchDate).getTime();
  const hoursUntil = (kickoff - now) / (60 * 60 * 1000);
  const soonBonus =
    hoursUntil >= 0 && hoursUntil <= 36 ? Math.max(0, 300 - hoursUntil * 10) : 0;
  return liveBonus + boost * 10 + soonBonus;
}

export function pickHeadlineMatches(
  live: HeadlineMatchRow[],
  upcoming: HeadlineMatchRow[],
  limit = 8,
  nowMs = Date.now(),
): HeadlineMatchRow[] {
  const horizon = nowMs + 36 * 60 * 60 * 1000;
  const pool: HeadlineMatchRow[] = [...live];

  for (const row of upcoming) {
    const kickoff = new Date(row.matchDate).getTime();
    if (kickoff <= horizon) pool.push(row);
  }

  const seen = new Set<number>();
  const unique = pool.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });

  const ranked = unique.sort((a, b) => {
    const diff = matchScore(b, nowMs) - matchScore(a, nowMs);
    if (diff !== 0) return diff;
    return new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime();
  });
  return takeHeadlineSlice(ranked, limit);
}

function takeHeadlineSlice<T extends { id: number; status: string; leagueName: string | null; leagueApiId?: number | null }>(
  ranked: T[],
  limit: number,
): T[] {
  // Prefer competitions we care about (live or upcoming) — not "any live match".
  const preferred = ranked.filter((m) => leagueBoost(m.leagueName, m.leagueApiId) > 0);
  if (preferred.length >= limit) return preferred.slice(0, limit);
  const preferredIds = new Set(preferred.map((m) => m.id));
  const fill = ranked.filter((m) => !preferredIds.has(m.id) && !isDemotedHeadlineLeague(m.leagueName));
  return [...preferred, ...fill].slice(0, limit);
}
