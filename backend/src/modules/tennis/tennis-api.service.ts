import { Injectable, Logger } from '@nestjs/common';

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';

export interface OddsApiEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    title: string;
    last_update: string;
    markets: Array<{
      key: string;
      last_update: string;
      outcomes: Array<{ name: string; price: number }>;
    }>;
  }>;
}

/**
 * Convert a 32-char hex string ID (The Odds API format) to a BIGINT-safe integer.
 * Takes the first 12 hex digits → max value ~17.6 trillion, safe for JS Number and PostgreSQL BIGINT.
 */
export function oddsIdToNumber(id: string): number {
  return parseInt(id.slice(0, 12), 16) || 0;
}

@Injectable()
export class TennisApiService {
  private readonly logger = new Logger(TennisApiService.name);

  private getApiKey(): string {
    return process.env.TENNIS_ODDS_API_KEY || '';
  }

  /**
   * Returns sport keys for all currently in-season tennis events.
   * Costs 0 API credits — safe to call frequently.
   */
  async getActiveTennisSports(): Promise<string[]> {
    const key = this.getApiKey();
    if (!key) {
      this.logger.warn('TENNIS_ODDS_API_KEY not set — skipping tennis sync');
      return [];
    }

    const res = await fetch(`${ODDS_API_BASE}/sports?apiKey=${key}`).catch(
      () => null,
    );
    if (!res || !res.ok) {
      this.logger.warn(`Sports list request failed: ${res?.status ?? 'network error'}`);
      return [];
    }

    const data = await res.json().catch(() => []);
    if (!Array.isArray(data)) return [];

    const keys = (data as Array<{ key: string; active: boolean }>)
      .filter((s) => s.key?.startsWith('tennis_') && s.active)
      .map((s) => s.key);

    this.logger.log(`Active tennis tournaments: ${keys.join(', ') || 'none'}`);
    return keys;
  }

  /**
   * Returns upcoming events + h2h odds for one tennis tournament.
   * Costs 1 API credit per call.
   */
  async getEventsWithOdds(sportKey: string): Promise<OddsApiEvent[]> {
    const key = this.getApiKey();
    if (!key) return [];

    const url = `${ODDS_API_BASE}/sports/${sportKey}/odds?apiKey=${key}&regions=eu,uk&markets=h2h&oddsFormat=decimal`;
    const res = await fetch(url).catch(() => null);
    if (!res || !res.ok) {
      this.logger.warn(`Odds request failed for ${sportKey}: ${res?.status ?? 'network error'}`);
      return [];
    }

    const data = await res.json().catch(() => []);
    if (!Array.isArray(data)) return [];
    return data as OddsApiEvent[];
  }
}
