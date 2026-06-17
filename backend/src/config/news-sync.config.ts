import type { SportType } from './sports.config';

/** Major club team IDs from API-Football (transfers endpoint). */
export const FOOTBALL_MAJOR_TEAM_IDS = [
  33, 40, 42, 47, 49, 50, 529, 541, 157, 489, 505, 492, 165, 116, 113, 81, 82,
];

/** Top European league IDs from API-Football (injuries endpoint). */
export const FOOTBALL_LEAGUE_IDS = [39, 140, 78, 135, 61];

/** NFL league ID on API-Sports american-football API. */
export const NFL_LEAGUE_ID = 1;

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
 * American football: NFL injuries verified via API docs + coverage.injuries flag.
 * Other sports remain manual/seed until probe confirms usable responses.
 */
export const NEWS_INJURIES_SYNC: NewsInjuriesSyncConfig[] = [
  { sport: 'football', leagueIds: FOOTBALL_LEAGUE_IDS, seasonMode: 'football' },
  { sport: 'american_football', leagueIds: [NFL_LEAGUE_ID], seasonMode: 'calendar' },
];

export type NewsSyncProbeKind = 'transfers' | 'injuries';

export interface NewsSyncProbeTarget {
  sport: SportType;
  kind: NewsSyncProbeKind;
  label: string;
  /** Path + query only, e.g. /injuries?league=1&season=2026 */
  path: string;
  /** When true, shown in admin probe but not enabled for cron sync */
  candidateOnly?: boolean;
}

/** One request per target — used by admin probe (does not run full sync). */
export function getNewsSyncProbeTargets(): NewsSyncProbeTarget[] {
  const calendarYear = new Date().getFullYear();
  const footballSeason = resolveNewsSyncSeason('football');
  return [
    {
      sport: 'football',
      kind: 'transfers',
      label: 'Football transfers (Man Utd)',
      path: `/transfers?team=${FOOTBALL_MAJOR_TEAM_IDS[0]}`,
    },
    {
      sport: 'football',
      kind: 'injuries',
      label: 'Football injuries (Premier League)',
      path: `/injuries?league=${FOOTBALL_LEAGUE_IDS[0]}&season=${footballSeason}`,
    },
    {
      sport: 'american_football',
      kind: 'injuries',
      label: 'NFL injuries',
      path: `/injuries?league=${NFL_LEAGUE_ID}&season=${calendarYear}`,
    },
    {
      sport: 'basketball',
      kind: 'injuries',
      label: 'Basketball injuries (candidate)',
      path: `/injuries?league=12&season=${calendarYear}`,
      candidateOnly: true,
    },
    {
      sport: 'basketball',
      kind: 'transfers',
      label: 'Basketball transfers (candidate)',
      path: '/transfers?team=161',
      candidateOnly: true,
    },
    {
      sport: 'rugby',
      kind: 'injuries',
      label: 'Rugby injuries (candidate)',
      path: `/injuries?league=1&season=${calendarYear}`,
      candidateOnly: true,
    },
    {
      sport: 'hockey',
      kind: 'injuries',
      label: 'Hockey injuries (candidate)',
      path: `/injuries?league=57&season=${calendarYear}`,
      candidateOnly: true,
    },
  ];
}

export function resolveNewsSyncSeason(mode: NewsSyncSeasonMode): number {
  const now = new Date();
  const year = now.getFullYear();
  if (mode === 'calendar') return year;
  return now.getMonth() >= 7 ? year : year - 1;
}
