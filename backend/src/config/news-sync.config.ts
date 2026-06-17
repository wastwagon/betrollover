import type { SportType } from './sports.config';

/** Major club team IDs from API-Football (transfers endpoint). */
export const FOOTBALL_MAJOR_TEAM_IDS = [
  33, 40, 42, 47, 49, 50, 529, 541, 157, 489, 505, 492, 165, 116, 113, 81, 82,
];

/** Top European league IDs from API-Football (injuries endpoint). */
export const FOOTBALL_LEAGUE_IDS = [39, 140, 78, 135, 61];

export type NewsSyncSeasonMode = 'football' | 'calendar';

export interface NewsTransfersSyncConfig {
  sport: SportType;
  teamIds: number[];
}

export interface NewsInjuriesSyncConfig {
  sport: SportType;
  leagueIds: number[];
  seasonMode: NewsSyncSeasonMode;
}

/**
 * Sports with verified API-Sports transfer endpoints.
 * Add entries only after confirming endpoint + response shape in the Live Tester.
 */
export const NEWS_TRANSFERS_SYNC: NewsTransfersSyncConfig[] = [
  { sport: 'football', teamIds: FOOTBALL_MAJOR_TEAM_IDS },
];

/**
 * Sports with verified API-Sports injuries endpoints.
 * Non-football APIs are not enabled until endpoint coverage is confirmed.
 */
export const NEWS_INJURIES_SYNC: NewsInjuriesSyncConfig[] = [
  { sport: 'football', leagueIds: FOOTBALL_LEAGUE_IDS, seasonMode: 'football' },
];

export function resolveNewsSyncSeason(mode: NewsSyncSeasonMode): number {
  const now = new Date();
  const year = now.getFullYear();
  if (mode === 'calendar') return year;
  return now.getMonth() >= 7 ? year : year - 1;
}
