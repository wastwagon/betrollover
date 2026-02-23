import { Injectable, Logger } from '@nestjs/common';

export const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';

/** Outcome for h2h (name only) or totals (name + point) */
type OddsOutcome = { name: string; price: number; point?: number };

/** Upcoming event with bookmaker h2h + totals odds */
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
      outcomes: OddsOutcome[];
    }>;
  }>;
}

/** Completed event with final scores */
export interface OddsApiScore {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  scores: Array<{ name: string; score: string }> | null;
  last_update: string | null;
}

/**
 * Internal sport-name → The Odds API key prefix mapping.
 * Used to discover active competitions and fetch scores for each sport.
 * Volleyball has no coverage on The Odds API — array is empty.
 */
export const SPORT_ODDS_PREFIXES: Record<string, string[]> = {
  basketball:        ['basketball_'],
  rugby:             ['rugbyleague_', 'rugbyunion_'],
  mma:               ['mma_'],
  hockey:            ['icehockey_'],
  american_football: ['americanfootball_'],
  tennis:            ['tennis_'],
  volleyball:        [], // not covered — revisit
};

/**
 * Convert a 32-char hex ID (The Odds API format) to a BIGINT-safe integer.
 * Takes first 12 hex digits → max ~17.6T, safe for JS Number and PostgreSQL BIGINT.
 */
export function oddsIdToNumber(id: string): number {
  return parseInt(id.slice(0, 12), 16) || 0;
}

@Injectable()
export class OddsApiService {
  private readonly logger = new Logger(OddsApiService.name);

  getApiKey(): string {
    return process.env.ODDS_API_KEY || process.env.TENNIS_ODDS_API_KEY || '';
  }

  /**
   * Returns sport keys that are currently in season matching any of the given prefixes.
   * Costs 0 API credits — safe to call at any time.
   */
  async getActiveSportKeys(prefixes: string[]): Promise<string[]> {
    if (!prefixes.length) return [];
    const key = this.getApiKey();
    if (!key) return [];

    const res = await fetch(`${ODDS_API_BASE}/sports?apiKey=${key}`).catch(() => null);
    if (!res?.ok) {
      this.logger.warn(`Sports list fetch failed: ${res?.status ?? 'network error'}`);
      return [];
    }

    const data = await res.json().catch(() => []);
    if (!Array.isArray(data)) return [];

    return (data as Array<{ key: string; active: boolean }>)
      .filter(
        (s) =>
          s.active &&
          prefixes.some((p) => s.key.startsWith(p)) &&
          // Exclude outright winner markets — no individual fixtures
          !s.key.includes('_winner') &&
          !s.key.includes('_championship'),
      )
      .map((s) => s.key);
  }

  /**
   * Returns upcoming events with h2h + totals odds for one competition.
   * Markets: h2h (Match Winner), totals (Over/Under).
   * Costs 1 API credit per market (h2h + totals = 2 credits per request).
   */
  async getEventsWithOdds(sportKey: string): Promise<OddsApiEvent[]> {
    const key = this.getApiKey();
    if (!key) return [];

    const url = `${ODDS_API_BASE}/sports/${sportKey}/odds?apiKey=${key}&regions=eu,uk&markets=h2h,totals&oddsFormat=decimal`;
    const res = await fetch(url).catch(() => null);
    if (!res?.ok) {
      this.logger.warn(`Odds fetch failed for ${sportKey}: ${res?.status ?? 'network error'}`);
      return [];
    }

    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? (data as OddsApiEvent[]) : [];
  }

  /**
   * Returns recent results (completed + upcoming) for one competition.
   * daysFrom=2 returns matches completed in the last 2 days + upcoming.
   * Costs 1 API credit.
   */
  async getScores(sportKey: string, daysFrom = 2): Promise<OddsApiScore[]> {
    const key = this.getApiKey();
    if (!key) return [];

    const url = `${ODDS_API_BASE}/sports/${sportKey}/scores?apiKey=${key}&daysFrom=${daysFrom}`;
    const res = await fetch(url).catch(() => null);
    if (!res?.ok) {
      this.logger.warn(`Scores fetch failed for ${sportKey}: ${res?.status ?? 'network error'}`);
      return [];
    }

    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? (data as OddsApiScore[]) : [];
  }

  /**
   * Preferred bookmaker order — we pick exactly one bookmaker per event.
   * Pinnacle is sharpest (used as reference line). Betway/Unibet are widely
   * recognised. Bet365 appears for some markets; we keep it in the list as well.
   */
  private readonly PREFERRED_BOOKMAKERS = [
    'pinnacle',
    'betway',
    'bet365',
    'unibet_uk',
    'unibet',
    'unibet_se',
    'unibet_nl',
    'williamhill',
    'paddypower',
    'coral',
    'skybet',
    'ladbrokes',
    'betfair_ex_eu',
    'betfair_ex_uk',
    'betfair_sb_uk',
    'draftkings',
    'fanduel',
    'bovada',
  ];

  /**
   * Extract h2h + totals odds from exactly ONE bookmaker per event.
   * Picks from PREFERRED_BOOKMAKERS in order; falls back to the first available.
   * Returns Match Winner (h2h) and Over/Under (totals) for simplest most-used markets.
   */
  extractH2hOdds(
    event: OddsApiEvent,
  ): Array<{ marketName: string; marketValue: string; odds: number }> {
    const bookmakers = event.bookmakers ?? [];
    if (!bookmakers.length) return [];

    const result: Array<{ marketName: string; marketValue: string; odds: number }> = [];

    // Pick one bookmaker for consistency (same logic as before)
    let chosenBm: typeof bookmakers[0] | null = null;
    for (const preferred of this.PREFERRED_BOOKMAKERS) {
      const bm = bookmakers.find((b) => b.key === preferred);
      if (bm?.markets?.length) {
        chosenBm = bm;
        break;
      }
    }
    if (!chosenBm) chosenBm = bookmakers[0];

    for (const market of chosenBm.markets ?? []) {
      if (market.key === 'h2h' && market.outcomes?.length) {
        for (const o of market.outcomes) {
          if (o.price > 0 && o.name) {
            result.push({ marketName: 'Match Winner', marketValue: o.name, odds: o.price });
          }
        }
      } else if (market.key === 'totals' && market.outcomes?.length) {
        for (const o of market.outcomes) {
          if (o.price > 0 && o.name) {
            const point = (o as OddsOutcome).point;
            const marketValue = point != null ? `${o.name} ${point}` : o.name;
            result.push({ marketName: 'Over/Under', marketValue, odds: o.price });
          }
        }
      }
    }

    return result;
  }

  /**
   * Parse a score string to a safe integer for storage.
   * Handles numeric scores ("115"), set-based scores ("2"), and binary win/loss ("1").
   */
  parseScore(raw: string | undefined | null): number | null {
    if (raw == null) return null;
    const n = parseFloat(raw);
    return Number.isFinite(n) ? Math.round(n) : null;
  }
}
