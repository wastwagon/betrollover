/** Platform fee on tipster gross when a marketplace pick wins (admin settings, clamped). */
export const PLATFORM_COMMISSION_MIN = 0;
export const PLATFORM_COMMISSION_MAX = 50;
export const PLATFORM_COMMISSION_DEFAULT = 30;

export function clampPlatformCommissionPercent(value: unknown): number {
  const n = Number(value ?? PLATFORM_COMMISSION_DEFAULT);
  if (Number.isNaN(n)) return PLATFORM_COMMISSION_DEFAULT;
  return Math.min(PLATFORM_COMMISSION_MAX, Math.max(PLATFORM_COMMISSION_MIN, n));
}
