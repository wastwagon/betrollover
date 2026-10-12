/** Matches backend ACCA_DESK_TIPSTER_TYPE. */
export const ACCA_DESK_TIPSTER_TYPE = 'acca_desk';

/** Matches backend VIP_TIPSTER_TYPE (house Two-Fold desk). */
export const VIP_DESK_TIPSTER_TYPE = 'vip_desk';

export function isAccaDeskTipsterType(type?: string | null): boolean {
  return (type || '').toLowerCase().trim() === ACCA_DESK_TIPSTER_TYPE;
}

export function isVipDeskTipsterType(type?: string | null): boolean {
  return (type || '').toLowerCase().trim() === VIP_DESK_TIPSTER_TYPE;
}

/**
 * Live slips behind the one VIP plan. Selection rules stay on each tipster.
 * SureTwoFold is free and is not in this list.
 */
export const VIP_ROSTER_USERNAMES = ['TheAnalyst', 'LateBloomer', 'AccaSure1X2'] as const;

export function isVipRosterUsername(username?: string | null): boolean {
  const u = (username || '').trim().toLowerCase();
  if (!u) return false;
  return VIP_ROSTER_USERNAMES.some((name) => name.toLowerCase() === u);
}
