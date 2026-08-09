/**
 * VIP / subscriptions feature flag (mirrors web/lib/subscriptions-enabled.ts).
 * Default: off. Set SUBSCRIPTIONS_ENABLED=true to re-enable.
 */

function parseFlag(raw: string | undefined): boolean | null {
  if (raw === undefined || raw === '') return null;
  const v = raw.trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true;
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false;
  return null;
}

export function isSubscriptionsEnabled(): boolean {
  const flag = parseFlag(process.env.SUBSCRIPTIONS_ENABLED);
  if (flag !== null) return flag;
  const publicFlag = parseFlag(process.env.NEXT_PUBLIC_SUBSCRIPTIONS_ENABLED);
  if (publicFlag !== null) return publicFlag;
  return false;
}
