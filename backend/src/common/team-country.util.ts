/** Map country name to ISO/FIFA code for flag display. Returns 2–3 letter code. */
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  england: 'ENG', germany: 'DEU', france: 'FRA', spain: 'ESP', italy: 'ITA', portugal: 'PRT',
  brazil: 'BRA', argentina: 'ARG', netherlands: 'NED', belgium: 'BEL', uruguay: 'URU',
  switzerland: 'SUI', croatia: 'HRV', denmark: 'DNK', sweden: 'SWE', poland: 'POL',
  mexico: 'MEX', usa: 'USA', ghana: 'GHA', nigeria: 'NGA', senegal: 'SEN', morocco: 'MAR',
  egypt: 'EGY', cameroon: 'CMR', ivory_coast: 'CIV', "côte d'ivoire": 'CIV', tunisia: 'TUN',
  scotland: 'SCO', wales: 'WAL', 'northern ireland': 'NIR', republic_of_ireland: 'IRL', ireland: 'IRL',
  japan: 'JPN', south_korea: 'KOR', korea_republic: 'KOR', australia: 'AUS', china: 'CHN',
};

export function normalizeCountryCode(val: unknown): string | null {
  if (typeof val !== 'string' || !val.trim()) return null;
  const s = val.trim().toUpperCase();
  if (s.length >= 2 && s.length <= 3 && /^[A-Z]+$/.test(s)) return s;
  const nameKey = val.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, '');
  return COUNTRY_NAME_TO_CODE[nameKey] ?? COUNTRY_NAME_TO_CODE[val.trim().toLowerCase()] ?? null;
}

/** Extract country codes from teams object (home/away). Nullable. */
export function extractCountryCodesFromTeams(homeTeam: any, awayTeam: any): { home: string | null; away: string | null } {
  const homeRaw = homeTeam?.team?.code ?? homeTeam?.team?.country ?? homeTeam?.code ?? homeTeam?.country ?? null;
  const awayRaw = awayTeam?.team?.code ?? awayTeam?.team?.country ?? awayTeam?.code ?? awayTeam?.country ?? null;
  return {
    home: normalizeCountryCode(homeRaw),
    away: normalizeCountryCode(awayRaw),
  };
}
