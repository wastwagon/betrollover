/** Odds for a single market outcome (e.g. Home @ 2.10) */
export interface FixtureOdd {
  id: number;
  marketName: string;
  marketValue: string;
  odds: number;
}

/** Football fixture from /fixtures API */
export interface Fixture {
  id: number;
  apiId?: number;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo?: string | null;
  awayTeamLogo?: string | null;
  homeCountryCode?: string | null;
  awayCountryCode?: string | null;
  leagueName: string | null;
  matchDate: string;
  status: string;
  odds?: FixtureOdd[];
  oddsError?: string;
  league?: {
    id: number;
    name: string;
    country: string | null;
  } | null;
}

/** Sport event from /basketball/events, /rugby/events, etc. */
export interface SportEventItem {
  id: number;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo?: string | null;
  awayTeamLogo?: string | null;
  homeCountryCode?: string | null;
  awayCountryCode?: string | null;
  leagueName: string | null;
  eventDate: string;
  status: string;
  odds?: FixtureOdd[];
}

export type CreatePickSport =
  | 'football'
  | 'basketball'
  | 'rugby'
  | 'mma'
  | 'volleyball'
  | 'hockey'
  | 'american_football'
  | 'tennis';

export type NonFootballSport = Exclude<CreatePickSport, 'football'>;

export interface FilterOptions {
  countries: string[];
  tournaments: Array<{
    id: number;
    name: string;
    country: string | null;
    apiId?: number;
    isInternational?: boolean;
  }>;
  leagues: Array<{
    id: number;
    name: string;
    country: string | null;
    category?: string | null;
    bookmakerTier?: string | null;
  }>;
}
