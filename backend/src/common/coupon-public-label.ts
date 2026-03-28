/**
 * User-facing coupon labels: stable id reference and optional tipster-entered title.
 */

const SUBJECT_MAX = 50;
const WALLET_MSG_MAX = 80;

export function couponPublicRef(id: number): string {
  return `Coupon #${id}`;
}

/** Truncate for email / push subject lines */
export function truncateCouponTitleForSubject(title: string, max = SUBJECT_MAX): string {
  const t = title.trim();
  if (!t) return '';
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

/** Wallet memos, in-app settlement messages — title + id when available */
export function couponUserFacingRef(id: number, title?: string | null): string {
  const t = title?.trim();
  if (!t) return couponPublicRef(id);
  const short = t.length > WALLET_MSG_MAX ? `${t.slice(0, WALLET_MSG_MAX - 1)}…` : t;
  return `${short} (${couponPublicRef(id)})`;
}

/** Rich email headline (card hero line) */
export function couponEmailHeadline(id: number, title?: string | null): string {
  const t = title?.trim();
  if (!t) return couponPublicRef(id);
  const short = truncateCouponTitleForSubject(t, 120);
  return short || couponPublicRef(id);
}
