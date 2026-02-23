/**
 * Centralized API-Sports limits configuration.
 * Override via env vars when upgrading to Pro or tuning for your quota.
 *
 * Free plan: ~100 req/day per sport. Pro: 7,500+ req/day per sport.
 * Set API_SPORTS_PLAN=pro in .env to use Pro defaults; otherwise Free defaults apply.
 *
 * Env overrides (all optional):
 *   API_SPORTS_PLAN=pro              Use Pro defaults (higher limits, lower delays)
 *   API_SYNC_LOOKAHEAD_DAYS=7        Fixture sync window (1-14)
 *   API_MAX_ODDS_EVENTS_PER_RUN=300  Max events to fetch odds for per sport sync
 *   API_MAX_FOOTBALL_ODDS_FIXTURES=300
 *   API_MAX_LEAGUE_BACKFILL_PER_RUN=50
 *   API_CALL_DELAY_MS=100            Delay between API calls (transfers, injuries)
 *   API_PREDICTION_DELAY_MS=100      Delay between prediction API calls
 *   API_FIXTURE_UPDATE_BATCH_SIZE=20 API batch size for fixture results
 *   API_MAX_FIXTURES_UPDATE_PER_RUN=100
 */

export const API_SPORTS_PLAN = (process.env.API_SPORTS_PLAN || 'free').toLowerCase() === 'pro' ? 'pro' : 'free';

/** Lookahead days for fixture/game sync (today through today+N) */
export const SYNC_LOOKAHEAD_DAYS = Math.min(
  Math.max(parseInt(process.env.API_SYNC_LOOKAHEAD_DAYS || '', 10) || (API_SPORTS_PLAN === 'pro' ? 7 : 7), 1),
  14
);

/** Max events without odds to fetch odds for per sync run (per sport). Free: 50; Pro: 300 */
export const MAX_ODDS_EVENTS_PER_RUN = Math.min(
  Math.max(parseInt(process.env.API_MAX_ODDS_EVENTS_PER_RUN || '', 10) || (API_SPORTS_PLAN === 'pro' ? 300 : 50), 1),
  500
);

/** Max football fixtures without odds per sync run */
export const MAX_FOOTBALL_ODDS_FIXTURES = Math.min(
  Math.max(parseInt(process.env.API_MAX_FOOTBALL_ODDS_FIXTURES || '', 10) || (API_SPORTS_PLAN === 'pro' ? 300 : 100), 1),
  500
);

/** Max leagues to backfill metadata per sync (league details API) */
export const MAX_LEAGUE_BACKFILL_PER_RUN = Math.min(
  Math.max(parseInt(process.env.API_MAX_LEAGUE_BACKFILL_PER_RUN || '', 10) || (API_SPORTS_PLAN === 'pro' ? 50 : 30), 1),
  100
);

/** Delay (ms) between API calls to avoid rate limits. Free: 350; Pro: 100 */
export const API_CALL_DELAY_MS = Math.max(
  parseInt(process.env.API_CALL_DELAY_MS || '', 10) || (API_SPORTS_PLAN === 'pro' ? 100 : 350),
  50
);

/** Max fixtures to fetch results for per batch (fixture-update) */
export const FIXTURE_UPDATE_BATCH_SIZE = Math.min(
  Math.max(parseInt(process.env.API_FIXTURE_UPDATE_BATCH_SIZE || '', 10) || 20, 1),
  50
);

/** Max fixtures to fetch in results API call (API returns 20 per request) */
export const RESULTS_FETCH_BATCH_SIZE = Math.min(
  Math.max(parseInt(process.env.API_RESULTS_FETCH_BATCH_SIZE || '', 10) || 20, 1),
  50
);

/** Max unfinished fixtures to process per settlement/update run */
export const MAX_FIXTURES_TO_UPDATE_PER_RUN = Math.min(
  Math.max(parseInt(process.env.API_MAX_FIXTURES_UPDATE_PER_RUN || '', 10) || (API_SPORTS_PLAN === 'pro' ? 100 : 50), 1),
  200
);

/** Delay between prediction API calls (ms) */
export const PREDICTION_API_DELAY_MS = Math.max(
  parseInt(process.env.API_PREDICTION_DELAY_MS || '', 10) || (API_SPORTS_PLAN === 'pro' ? 100 : 150),
  50
);

/** Build array of date strings for sync (today through today+lookahead) */
export function getSyncDates(): string[] {
  const dates: string[] = [];
  const now = new Date();
  const utc = { y: now.getUTCFullYear(), m: now.getUTCMonth(), d: now.getUTCDate() };
  for (let i = 0; i < SYNC_LOOKAHEAD_DAYS; i++) {
    const d = new Date(Date.UTC(utc.y, utc.m, utc.d + i, 12, 0, 0, 0));
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}
