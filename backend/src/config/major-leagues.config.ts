/**
 * Major-league gate for safe 2-leg AI accas.
 * Prefers API league IDs; falls back to name patterns with an amateur blocklist.
 */

/** API-Football league IDs: top domestic leagues, major cups, and international competitions. */
export const MAJOR_LEAGUE_API_IDS = new Set<number>([
  // Big 5 + close peers
  39, 140, 135, 78, 61, 40, 41, 42, 43, // England + Spain + Italy + France tiers
  79, 62, 141, 136, // DE/FR/ES/IT second tiers
  88, 89, 94, 144, 145, // NL, PT, BE
  203, 204, 207, 218, 219, // TR, CH, AT
  119, 113, 103, 197, 198, // DK, SE, NO, GR
  106, 107, // PL
  179, 180, // Scotland
  253, 262, 128, 71, 72, 129, // Americas top
  98, 99, 292, 293, 188, 190, // JP, KR, AU
  307, 333, 210, 211, // SA, UA, HR
  169, 170, // China
  235, 236, // Russia
  // Major cups & international
  2, 3, 848, 531, // UCL, UEL, UECL, UEFA Super Cup
  1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, // World / continental cups (API ids vary by season)
  45, 48, 66, 81, 137, 143, 556, 557, // FA Cup, EFL Cup, Coupe de France, DFB, Coppa, Copa del Rey
  32, 34, 35, 36, // World Cup qualifiers / Euro
  525, 526, // AFC/CAF sometimes — keep broad cup ids from enabled list
  487, 488, // UEFA Nations League
  102, 103, // Norwegian — 103 already
  271, 272, // MLS-related / US Open Cup
  165, 166, // Copa Libertadores / Sudamericana (verify ids)
  13, 14, 15, 16, // CONMEBOL / CONCACAF gold cup style
  673, 674, // Leagues Cup etc.
  218, 244, // USL Championship (244), not League Two
  254, 255, // NWSL / women's top — optional, include for coverage
]);

/**
 * Substrings that indicate amateur / semi-pro / state leagues (case-insensitive).
 * English "League Two" (EFL) is professional — do not block bare "league two" globally;
 * use "usl league two", "npl", regional prefixes instead.
 */
export const AMATEUR_LEAGUE_NAME_BLOCKLIST: readonly string[] = [
  ' npl',
  'npl ',
  'nsw npl',
  'victoria npl',
  'queensland npl',
  'tasmania npl',
  'capital territory npl',
  'new south wales npl',
  'usl league two',
  'usl league one',
  'friendlies clubs',
  'friendlies',
  'division 2 -',
  'division 2 –',
  '3. lig',
  'gamma ethniki',
  'srpska liga',
  'mineiro -',
  'pernambucano -',
  'campeonato de portugal prio',
  'regional cup',
  'youth',
  ' u19',
  ' u21',
  ' u23',
  'women u',
  'reserve',
  ' amateur',
  'geoje citizen',
  'korean fa cup',
  'league two -', // state leagues, not EFL League Two
  'league three -',
  'non league',
  'tercera',
  'tercera division',
  'fourth division',
  '5th division',
  'sixth division',
];

/** Name hints when API league id is missing (e.g. API-only scripts). */
export const MAJOR_LEAGUE_NAME_PATTERNS: readonly string[] = [
  'premier league',
  'english premier',
  'la liga',
  'laliga',
  'serie a',
  'bundesliga',
  'ligue 1',
  'ligue 2',
  'championship',
  'league one',
  'league two',
  'eredivisie',
  'primeira liga',
  'liga mx',
  'major league soccer',
  'mls',
  'champions league',
  'europa league',
  'conference league',
  'world cup',
  'nations league',
  'euro ',
  'copa america',
  'africa cup',
  'fa cup',
  'efl cup',
  'carabao',
  'coppa italia',
  'dfb pokal',
  'copa del rey',
  'coupe de france',
  'super lig',
  'k league 1',
  'j1 league',
  'a-league',
  'superliga',
  'allsvenskan',
  'eliteserien',
  'ekstraklasa',
  'pro league',
  'liga profesional',
  'scottish premiership',
  'belgian pro league',
  'libertadores',
  'sudamericana',
  'usl championship',
  'nwsl',
];

export function isAmateurLeagueName(leagueName: string | null | undefined): boolean {
  if (!leagueName) return true;
  const n = leagueName.toLowerCase().trim();
  return AMATEUR_LEAGUE_NAME_BLOCKLIST.some((frag) => n.includes(frag));
}

export function isMajorLeagueForSafeAcca(
  leagueName: string | null | undefined,
  apiLeagueId?: number | null,
): boolean {
  if (apiLeagueId != null && MAJOR_LEAGUE_API_IDS.has(apiLeagueId)) {
    return true;
  }
  if (!leagueName || isAmateurLeagueName(leagueName)) {
    return false;
  }
  const n = leagueName.toLowerCase().trim();
  return MAJOR_LEAGUE_NAME_PATTERNS.some((frag) => n.includes(frag));
}
