/**
 * Curated bookmakers popular in Africa — keys are stored on picks (API / DB).
 * Keep keys stable; change labels freely for UI.
 */
export const AFRICAN_BOOKMAKERS = [
  { key: 'sportybet', label: 'SportyBet' },
  { key: 'betway', label: 'Betway' },
  { key: '1xbet', label: '1xBet' },
  { key: 'betking', label: 'BetKing' },
  { key: 'msport', label: 'MSport' },
  { key: '22bet', label: '22Bet' },
  { key: 'melbet', label: 'Melbet' },
  { key: 'premierbet', label: 'Premier Bet' },
  { key: 'hollywoodbets', label: 'Hollywoodbets' },
  { key: 'betpawa', label: 'betPawa' },
  { key: 'merrybet', label: 'Merrybet' },
  { key: 'nairabet', label: 'NairaBet' },
  { key: 'bangbet', label: 'Bangbet' },
  { key: 'paripesa', label: 'Paripesa' },
  { key: 'fortebet', label: 'Fortebet' },
  { key: 'other', label: 'Other' },
] as const;

const KEY_SET = new Set<string>(AFRICAN_BOOKMAKERS.map((b) => b.key));

export function isAllowedAfricanBookmakerKey(key: string): boolean {
  return KEY_SET.has(key);
}

export function bookmakerLabelForKey(key: string): string | null {
  const row = AFRICAN_BOOKMAKERS.find((b) => b.key === key);
  return row ? row.label : null;
}
