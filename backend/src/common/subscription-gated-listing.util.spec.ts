import {
  listingIsSubscriptionGated,
  marketplaceOpenFreeListingSql,
} from './subscription-gated-listing.util';

describe('subscription-gated marketplace listings', () => {
  it('treats house VIP dual placement as gated even at price 0', () => {
    expect(listingIsSubscriptionGated({ placement: 'both', subscriptionPackageId: 9 })).toBe(true);
    expect(listingIsSubscriptionGated({ placement: 'subscription', subscriptionPackageId: null })).toBe(
      true,
    );
    expect(listingIsSubscriptionGated({ placement: 'marketplace', subscriptionPackageId: 4 })).toBe(true);
  });

  it('leaves Acca Desk / ordinary free marketplace listings ungated', () => {
    expect(listingIsSubscriptionGated({ placement: 'marketplace', subscriptionPackageId: null })).toBe(
      false,
    );
    expect(listingIsSubscriptionGated({ placement: undefined, subscriptionPackageId: 0 })).toBe(false);
    expect(listingIsSubscriptionGated(null)).toBe(false);
  });

  it('builds open-free SQL that excludes dual-placement VIP rows', () => {
    expect(marketplaceOpenFreeListingSql('pm')).toContain("placement), 'marketplace') = 'marketplace'");
    expect(marketplaceOpenFreeListingSql('pm')).toContain('subscription_package_id IS NULL');
  });
});
