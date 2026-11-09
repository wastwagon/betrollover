/** Matches backend ACCA_DESK_TIPSTER_TYPE. */
export const ACCA_DESK_TIPSTER_TYPE = 'acca_desk';

/**
 * DB tipster_type for free Sure · Two-Fold (`vip_desk` is a legacy value — not AccaSure1X2 VIP).
 */
export const VIP_DESK_TIPSTER_TYPE = 'vip_desk';
export const FREE_TWO_FOLD_TIPSTER_TYPE = VIP_DESK_TIPSTER_TYPE;

export function isAccaDeskTipsterType(type?: string | null): boolean {
  return (type || '').toLowerCase().trim() === ACCA_DESK_TIPSTER_TYPE;
}

export function isVipDeskTipsterType(type?: string | null): boolean {
  return (type || '').toLowerCase().trim() === VIP_DESK_TIPSTER_TYPE;
}

/** Alias — free Sure · Two-Fold desk type check. */
export const isFreeTwoFoldTipsterType = isVipDeskTipsterType;

/**
 * Live slips behind the one VIP plan (AccaSure1X2). SureTwoFold is free and is not listed.
 */
export const VIP_ROSTER_USERNAMES = ['AccaSure1X2'] as const;

export function isVipRosterUsername(username?: string | null): boolean {
  const u = (username || '').trim().toLowerCase();
  if (!u) return false;
  return VIP_ROSTER_USERNAMES.some((name) => name.toLowerCase() === u);
}
