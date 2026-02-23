/**
 * Multi-sport configuration.
 * Football is always enabled. Other sports are enabled via ENABLED_SPORTS env.
 */

export const SPORT_TYPES = ['football', 'basketball', 'rugby', 'mma', 'volleyball', 'hockey', 'american_football', 'tennis'] as const;
export type SportType = (typeof SPORT_TYPES)[number];

export const SPORT_DISPLAY_NAMES: Record<SportType, string> = {
  football: 'Football',
  basketball: 'Basketball',
  rugby: 'Rugby',
  mma: 'MMA',
  volleyball: 'Volleyball',
  hockey: 'Hockey',
  american_football: 'American Football',
  tennis: 'Tennis',
};

/**
 * API-Sports base URLs (dashboard My Access).
 * Basketball API covers NBA + 420+ leagues; do not add v2.nba.api-sports.io (redundant).
 */
export const SPORT_API_BASE_URLS: Partial<Record<SportType, string>> = {
  football: 'https://v3.football.api-sports.io',
  basketball: 'https://v1.basketball.api-sports.io',
  rugby: 'https://v1.rugby.api-sports.io',
  mma: 'https://v1.mma.api-sports.io',
  volleyball: 'https://v1.volleyball.api-sports.io',
  hockey: 'https://v1.hockey.api-sports.io',
  american_football: 'https://v1.american-football.api-sports.io',
  tennis: 'https://v1.tennis.api-sports.io',
};

export function getEnabledSports(): SportType[] {
  const raw = process.env.ENABLED_SPORTS || 'football';
  const list = raw.split(',').map((s) => s.trim().toLowerCase());
  const result: SportType[] = [];
  for (const s of list) {
    if (SPORT_TYPES.includes(s as SportType)) result.push(s as SportType);
  }
  if (!result.includes('football')) result.unshift('football');
  return result;
}

export function isSportEnabled(sport: SportType): boolean {
  return getEnabledSports().includes(sport);
}

/** Get API-Sports base URL for a sport. Throws if sport has no URL configured. */
export function getSportApiBaseUrl(sport: SportType): string {
  const url = SPORT_API_BASE_URLS[sport];
  if (!url) throw new Error(`No API base URL configured for sport: ${sport}`);
  return url;
}
