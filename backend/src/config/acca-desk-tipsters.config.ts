/**
 * Acca Desk tipsters — automated 2-leg free picks via Acca Generator.
 *
 * Core roster: Sure + Safe + Medium × (1X2, DC, BTTS, O2.5, O1.5, Mix) = 18.
 * Plus High · O2.5 and High · O1.5 so totals have all four risk bands.
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
  mix: 'Mix',
};

const RISKS: AccaDeskTipsterConfig['riskLevel'][] = ['sure', 'safe', 'medium'];

/** High is totals-only (O2.5 / O1.5). 1X2, DC, BTTS, Mix stay Sure / Safe / Medium. */
const HIGH_MARKET_KEYS = new Set(['o25', 'o15']);

const MARKET_SPECS: { key: string; label: string; markets: string[] }[] = [
  { key: '1x2', label: '1X2 (Match Winner)', markets: ['match_winner'] },
  { key: 'dc', label: 'Double Chance', markets: ['double_chance'] },
  { key: 'btts', label: 'BTTS (Yes)', markets: ['btts'] },
  { key: 'o25', label: 'Over 2.5 Goals', markets: ['over25'] },
  { key: 'o15', label: 'Over 1.5 Goals', markets: ['over15'] },
  { key: 'mix', label: 'Mixed Markets', markets: [...new Set(['over15', ...DEFAULT_ACCA_MARKETS])] },
];

/** Fixed order: Sure block → Safe → Medium; within each: 1X2, DC, BTTS, O2.5, O1.5, Mix. Then High totals. */
export const ACCA_DESK_TIPSTERS: AccaDeskTipsterConfig[] = [
  ...RISKS.flatMap((risk) => MARKET_SPECS.map((m) => desk(risk, m.key, m.label, m.markets))),
  ...MARKET_SPECS.filter((m) => HIGH_MARKET_KEYS.has(m.key)).map((m) =>
    desk('high', m.key, m.label, m.markets),
  ),
];

export const ACCA_DESK_TIPSTER_TYPE = 'acca_desk';
export const ACCA_DESK_LEGS = 2 as const;
export { ACCA_DESK_MAX_PER_DAY, ACCA_DESK_TIME_SLOTS } from './acca-desk-slots';

/** Cron: 00:30 Africa/Accra — catch-up for today’s desk day after midnight. */
export const ACCA_DESK_DAILY_CRON = process.env.ACCA_DESK_DAILY_CRON || '30 0 * * *';

/** Cron: 20:00 Africa/Accra — publish tomorrow’s full desk day (~24h ahead). */
export const ACCA_DESK_EARLY_CRON = process.env.ACCA_DESK_EARLY_CRON || '0 20 * * *';

export function isAccaDeskEnabled(): boolean {
  const raw = (process.env.ACCA_DESK_ENABLED || 'true').toLowerCase().trim();
  return raw !== 'false' && raw !== '0' && raw !== 'no';
}

export function isAccaDeskEarlyPublishEnabled(): boolean {
  const raw = (process.env.ACCA_DESK_EARLY_ENABLED || 'true').toLowerCase().trim();
  return raw !== 'false' && raw !== '0' && raw !== 'no';
}
