/** Matches backend ACCA_DESK_TIPSTER_TYPE. */
export const ACCA_DESK_TIPSTER_TYPE = 'acca_desk';

export function isAccaDeskTipsterType(type?: string | null): boolean {
  return (type || '').toLowerCase().trim() === ACCA_DESK_TIPSTER_TYPE;
}
