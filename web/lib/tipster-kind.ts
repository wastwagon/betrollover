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
