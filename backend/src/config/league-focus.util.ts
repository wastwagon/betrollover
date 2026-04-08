/**
 * leagues_focus matching for AI tipsters: config strings vs fixture.leagueName from API/DB.
 */

const PREMIER_LEAGUE_ALIASES = [
  'premier league',
  'english premier league',
  'epl',
  'england - premier league',
  'premier league - england',
  'barclays premier league',
];

/** Normalised keys (no spaces) and spaced keys for leagueMatchesFocus lookup. */
export const LEAGUE_FOCUS_ALIASES: Record<string, string[]> = {
  premierleague: [...PREMIER_LEAGUE_ALIASES],
  'premier league': [...PREMIER_LEAGUE_ALIASES],
  laliga: ['la liga', 'laliga', 'spanish la liga', 'laliga santander'],
  'la liga': ['la liga', 'laliga', 'spanish la liga', 'laliga santander'],
  seriea: ['serie a', 'italian serie a', 'serie a tim'],
  'serie a': ['serie a', 'italian serie a', 'serie a tim'],
  bundesliga: ['bundesliga', 'german bundesliga', 'bundesliga 1'],
  ligue1: ['ligue 1', 'france ligue 1', 'ligue 1 ubereats'],
  'ligue 1': ['ligue 1', 'france ligue 1', 'ligue 1 ubereats'],
  championship: ['championship', 'english championship', 'efl championship', 'championship league'],
};

/**
 * True if fixture league name matches a config focus entry (substring, normalised, or alias).
 */
export function leagueMatchesFocus(fixtureLeagueName: string | null, configLeague: string): boolean {
  if (!fixtureLeagueName) return false;
  const f = fixtureLeagueName.toLowerCase().trim();
  const c = configLeague.toLowerCase().trim();
  if (f.includes(c)) return true;
  const fNorm = f.replace(/\s+/g, '');
  const cNorm = c.replace(/\s+/g, '');
  if (fNorm.includes(cNorm) || cNorm.includes(fNorm)) return true;
  const aliases = LEAGUE_FOCUS_ALIASES[cNorm] ?? [cNorm];
  return aliases.some((alias) => f.includes(alias) || fNorm.includes(alias.replace(/\s+/g, '')));
}
