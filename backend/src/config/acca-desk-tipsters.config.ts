/**
 * Acca Desk tipsters — automated 2-leg free picks via Acca Generator.
 *
 * Core roster: Sure + Safe + Medium × (1X2, DC, BTTS, O2.5, O1.5, U1.5, DNB, FH1X2, FHO1.5, Mix).
 * Plus High for totals (O2.5 / O1.5 / U1.5 / FH Over 1.5).
 * Order = fixture allocation order (fixed exclusivity).
 */

import { DEFAULT_ACCA_MARKETS, type AccaRiskLevel } from '../modules/acca-generator/acca-generator.markets';

export type AccaDeskTipsterConfig = {
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  /** Stable analytics id — do not rename casually. */
  strategy_id: string;
  riskLevel: AccaRiskLevel;
  markets: string[];
  /** Always 2 in v1. */
  legs: 2;
};

function desk(
  risk: AccaDeskTipsterConfig['riskLevel'],
  marketKey: string,
  marketLabel: string,
  markets: string[],
): AccaDeskTipsterConfig {
  const riskLabel = risk.charAt(0).toUpperCase() + risk.slice(1);
  const marketSlug = MARKET_SLUG[marketKey] ?? marketKey.toUpperCase();
  return {
    username: `Acca${riskLabel}${marketSlug}`,
    display_name: `${riskLabel} · ${marketLabel}`,
    bio: `${riskLabel} · ${marketLabel} only. Up to 4 free 2-fold picks a day (early / afternoon / evening / midnight), clustered by kick-off. Educational odd bands — not guaranteed. 18+.`,
    avatar_url: `/avatars/acca_${risk}_${marketKey}.png?v=2`,
    strategy_id: `acca_desk_${risk}_${marketKey}`,
    riskLevel: risk,
    markets,
    legs: 2,
  };
}

const MARKET_SLUG: Record<string, string> = {
  '1x2': '1X2',
  dc: 'DC',
  btts: 'BTTS',
  o25: 'O25',
  o15: 'O15',
  u15: 'U15',
  dnb: 'DNB',
  fh1x2: 'FH1X2',
  fh015: 'FHO15',
  mix: 'Mix',
};

const RISKS: AccaDeskTipsterConfig['riskLevel'][] = ['sure', 'safe', 'medium'];

/** High is totals-only (FT O/U + 1H Over 1.5). 1X2, DC, BTTS, DNB, FH Winner, Mix stay Sure / Safe / Medium. */
const HIGH_MARKET_KEYS = new Set(['o25', 'o15', 'u15', 'fh015']);

const MARKET_SPECS: { key: string; label: string; markets: string[] }[] = [
  { key: '1x2', label: '1X2 (Match Winner)', markets: ['match_winner'] },
  { key: 'dc', label: 'Double Chance', markets: ['double_chance'] },
  { key: 'btts', label: 'BTTS (Yes)', markets: ['btts'] },
  { key: 'o25', label: 'Over 2.5 Goals', markets: ['over25'] },
  { key: 'o15', label: 'Over 1.5 Goals', markets: ['over15'] },
  { key: 'u15', label: 'Under 1.5 Goals', markets: ['under15'] },
  { key: 'dnb', label: 'Draw No Bet', markets: ['dnb'] },
  { key: 'fh1x2', label: '1st Half Winner', markets: ['fh_winner'] },
  { key: 'fh015', label: '1st Half Over 1.5', markets: ['fh_over15'] },
  { key: 'mix', label: 'Mixed Markets', markets: [...new Set(['over15', ...DEFAULT_ACCA_MARKETS])] },
];

/** Fixed order: Sure → Safe → Medium blocks; then High totals. */
export const ACCA_DESK_TIPSTERS: AccaDeskTipsterConfig[] = [
  ...RISKS.flatMap((risk) => MARKET_SPECS.map((m) => desk(risk, m.key, m.label, m.markets))),
  ...MARKET_SPECS.filter((m) => HIGH_MARKET_KEYS.has(m.key)).map((m) =>
    desk('high', m.key, m.label, m.markets),
  ),
];

export const ACCA_DESK_TIPSTER_TYPE = 'acca_desk';
export const ACCA_DESK_LEGS = 2 as const;
export { ACCA_DESK_MAX_PER_DAY, ACCA_DESK_TIME_SLOTS } from './acca-desk-slots';

/**
 * Live desks that lose as a book (week + month + all-time). Stay in the roster
 * so they can be turned back on, but do not publish or appear on public lists.
 */
export const ACCA_DESK_PAUSED_USERNAMES = new Set([
  'AccaMediumO25',
  'AccaSafeBTTS',
  'AccaSafeO25',
  'AccaSureBTTS',
  'AccaSureO15',
  'AccaMedium1X2',
  'AccaSureMix',
  'AccaHighFHO15',
  'AccaHighU15',
]);

export function isAccaDeskPublishingPaused(username: string): boolean {
  return ACCA_DESK_PAUSED_USERNAMES.has(username);
}

export function accaDeskPausedUsernames(): string[] {
  return [...ACCA_DESK_PAUSED_USERNAMES];
}

/** TypeORM QB. Bind `:...accaDeskPaused` to `accaDeskPausedUsernames()`. */
export function accaDeskPausedPublicExcludeSql(tipsterAlias = 't'): string {
  return `${tipsterAlias}.username NOT IN (:...accaDeskPaused)`;
}

/** Raw SQL. Usernames are compile-time constants from the pause set. */
export function accaDeskPausedPublicExcludeRawSql(tipsterAlias = 't'): string {
  const names = accaDeskPausedUsernames();
  if (names.length === 0) return 'TRUE';
  const list = names.map((n) => `'${n.replace(/'/g, "''")}'`).join(', ');
  return `${tipsterAlias}.username NOT IN (${list})`;
}

/** Hide paused Acca desk marketplace tickets (ticket owner = tipster user_id). */
export function accaDeskPausedMarketplaceTicketExcludeRawSql(ticketAlias = 't'): string {
  const names = accaDeskPausedUsernames();
  if (names.length === 0) return 'TRUE';
  const list = names.map((n) => `'${n.replace(/'/g, "''")}'`).join(', ');
  return `NOT EXISTS (
    SELECT 1 FROM tipsters paused_acca
    WHERE paused_acca.user_id = ${ticketAlias}.user_id
      AND paused_acca.username IN (${list})
  )`;
}

/** Cron: 00:30 Africa/Accra — catch-up for today’s desk day after midnight. */
export const ACCA_DESK_DAILY_CRON = process.env.ACCA_DESK_DAILY_CRON || '30 0 * * *';

/** Cron: 20:10 Africa/Accra — tomorrow’s desk, after VIP Home+Home at 20:00. */
export const ACCA_DESK_EARLY_CRON = process.env.ACCA_DESK_EARLY_CRON || '10 20 * * *';

export function isAccaDeskEnabled(): boolean {
  const raw = (process.env.ACCA_DESK_ENABLED || 'true').toLowerCase().trim();
  return raw !== 'false' && raw !== '0' && raw !== 'no';
}

export function isAccaDeskEarlyPublishEnabled(): boolean {
  const raw = (process.env.ACCA_DESK_EARLY_ENABLED || 'true').toLowerCase().trim();
  return raw !== 'false' && raw !== '0' && raw !== 'no';
}
