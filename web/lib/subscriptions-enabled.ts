/**
 * Subscriptions / VIP feature flag.
 *
 * When disabled, public nav, tipster VIP CTAs, checkout, and package management
 * are hidden so we don't advertise a product surface we are not operating.
 *
 * Set NEXT_PUBLIC_SUBSCRIPTIONS_ENABLED=true (or SUBSCRIPTIONS_ENABLED=true)
 * to turn VIP subscriptions back on.
 *
 * Independent tipster VIP plans can be paused without hiding AccaSure1X2 or free Sure · Two-Fold:
 * NEXT_PUBLIC_HUMAN_VIP_PACKAGES_ENABLED=false (and HUMAN_VIP_PACKAGES_ENABLED=false on the API).
 *
 * Free Sure · Two-Fold publish does not depend on this flag.
 * Default: false (hidden).
 */

function parseFlag(raw: string | undefined): boolean | null {
  if (raw === undefined || raw === '') return null;
  const v = raw.trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true;
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false;
  return null;
}

/** True when VIP / subscription surfaces should be shown. */
export function isSubscriptionsEnabled(): boolean {
  const publicFlag = parseFlag(process.env.NEXT_PUBLIC_SUBSCRIPTIONS_ENABLED);
  if (publicFlag !== null) return publicFlag;
  const serverFlag = parseFlag(process.env.SUBSCRIPTIONS_ENABLED);
  if (serverFlag !== null) return serverFlag;
  return false;
}

/** Independent tipster VIP packages (not AccaSure1X2 house VIP / not free Two-Fold). Default on. */
export function isHumanVipPackagesEnabled(): boolean {
  if (!isSubscriptionsEnabled()) return false;
  const publicFlag = parseFlag(process.env.NEXT_PUBLIC_HUMAN_VIP_PACKAGES_ENABLED);
  if (publicFlag !== null) return publicFlag;
  const serverFlag = parseFlag(process.env.HUMAN_VIP_PACKAGES_ENABLED);
  if (serverFlag !== null) return serverFlag;
  return true;
}
