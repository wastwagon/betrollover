/**
 * Shared interfaces for multi-sport expansion.
 * Football uses Fixture; other sports use SportEvent.
 */

import type { SportType } from '../../../config/sports.config';

export interface ISportEvent {
  id: number;
  sport: SportType | string;
  homeTeam: string;
  awayTeam: string;
  eventDate: Date;
  status: string;
  homeScore?: number | null;
  awayScore?: number | null;
  leagueName?: string | null;
  leagueId?: number | null;
}

export interface ISportEventSync {
  syncUpcomingEvents(leagueIds?: number[], daysAhead?: number): Promise<{ synced: number }>;
}

export interface ISportOddsSync {
  syncOddsForEvents(eventIds: number[]): Promise<{ synced: number }>;
}
