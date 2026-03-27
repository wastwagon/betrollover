/**
 * User-facing coupon reference without exposing the tipster-entered title
 * (used in emails, notifications, wallet memos).
 */
export function couponPublicRef(id: number): string {
  return `Coupon #${id}`;
}
