/**
 * Subscriptions / VIP feature flag.
 *
 * When disabled, public nav, tipster VIP CTAs, checkout, and package management
 * are hidden so we don't advertise a product surface we are not operating.
 *
 * Set NEXT_PUBLIC_SUBSCRIPTIONS_ENABLED=true (or SUBSCRIPTIONS_ENABLED=true)
 * to turn VIP subscriptions back on.
 *
 * Independent tipster VIP plans can be paused without hiding the house Two-Fold desk:
 * NEXT_PUBLIC_HUMAN_VIP_PACKAGES_ENABLED=false (and HUMAN_VIP_PACKAGES_ENABLED=false on the API).
 *
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

/** Independent tipster VIP packages (not the house Two-Fold desk). Default on. */
export function isHumanVipPackagesEnabled(): boolean {
  if (!isSubscriptionsEnabled()) return false;
  const publicFlag = parseFlag(process.env.NEXT_PUBLIC_HUMAN_VIP_PACKAGES_ENABLED);
  if (publicFlag !== null) return publicFlag;
  const serverFlag = parseFlag(process.env.HUMAN_VIP_PACKAGES_ENABLED);
  if (serverFlag !== null) return serverFlag;
  return true;
}
