/**
 * Acca Desk tipsters — automated 2-leg free picks via Acca Generator.
 *
 * v1 roster (locked): Sure + Safe + Medium × (1X2, DC, BTTS, O2.5, Mix) = 15.
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
  riskLevel: Exclude<AccaRiskLevel, 'high'>;
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
  const marketSlug =
    marketKey === '1x2'
      ? '1X2'
      : marketKey === 'dc'
        ? 'DC'
        : marketKey === 'btts'
          ? 'BTTS'
          : marketKey === 'o25'
            ? 'O25'
            : 'Mix';
  return {
    username: `Acca${riskLabel}${marketSlug}`,
    display_name: `${riskLabel} · ${marketLabel}`,
    bio: `${riskLabel} Acca Desk · ${marketLabel} only · up to 3 daily 2-fold free picks (early / afternoon / evening), clustered by kick-off. Odd-band education — not guaranteed. 18+.`,
    avatar_url: `/avatars/acca_${risk}_${marketKey}.png`,
    strategy_id: `acca_desk_${risk}_${marketKey}`,
    riskLevel: risk,
    markets,
    legs: 2,
  };
}

const RISKS: AccaDeskTipsterConfig['riskLevel'][] = ['sure', 'safe', 'medium'];

const MARKET_SPECS: { key: string; label: string; markets: string[] }[] = [
  { key: '1x2', label: '1X2 (Match Winner)', markets: ['match_winner'] },
  { key: 'dc', label: 'Double Chance', markets: ['double_chance'] },
  { key: 'btts', label: 'BTTS (Yes)', markets: ['btts'] },
  { key: 'o25', label: 'Over 2.5 Goals', markets: ['over25'] },
  { key: 'mix', label: 'Mixed Markets', markets: [...DEFAULT_ACCA_MARKETS] },
];

/** Fixed order: Sure block → Safe → Medium; within each: 1X2, DC, BTTS, O2.5, Mix. */
export const ACCA_DESK_TIPSTERS: AccaDeskTipsterConfig[] = RISKS.flatMap((risk) =>
  MARKET_SPECS.map((m) => desk(risk, m.key, m.label, m.markets)),
);

export const ACCA_DESK_TIPSTER_TYPE = 'acca_desk';
export const ACCA_DESK_LEGS = 2 as const;
export { ACCA_DESK_MAX_PER_DAY, ACCA_DESK_TIME_SLOTS } from './acca-desk-slots';

/** Cron: 00:30 Africa/Accra — after midnight fixture/odds sync window. */
export const ACCA_DESK_DAILY_CRON = process.env.ACCA_DESK_DAILY_CRON || '30 0 * * *';

export function isAccaDeskEnabled(): boolean {
  const raw = (process.env.ACCA_DESK_ENABLED || 'true').toLowerCase().trim();
  return raw !== 'false' && raw !== '0' && raw !== 'no';
}
