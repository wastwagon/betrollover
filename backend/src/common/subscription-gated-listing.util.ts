/**
 * House VIP (and any subscription-linked coupon) can sit on the marketplace at price 0
 * without being a free unlock. Placement `both` / `subscription` or a package id marks that.
 */
export function listingIsSubscriptionGated(
  listing?: {
    placement?: string | null;
    subscriptionPackageId?: number | null;
  } | null,
): boolean {
  if (!listing) return false;
  const placement = (listing.placement || '').toLowerCase().trim();
  if (placement === 'both' || placement === 'subscription') return true;
  const pkgId = Number(listing.subscriptionPackageId);
  return Number.isFinite(pkgId) && pkgId > 0;
}

/**
 * SQL fragment: marketplace rows that are actually free to unlock (not VIP-covered).
 * `pmAlias` must be the pick_marketplace table/alias (snake_case columns).
 */
export function marketplaceOpenFreeListingSql(pmAlias = 'pm'): string {
  return `(${pmAlias}.price = 0 AND COALESCE(LOWER(${pmAlias}.placement), 'marketplace') = 'marketplace' AND ${pmAlias}.subscription_package_id IS NULL)`;
}
