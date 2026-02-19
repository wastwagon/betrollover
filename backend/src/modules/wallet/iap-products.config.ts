/**
 * IAP product IDs and GHS amounts for wallet top-up.
 * Product IDs must match those configured in App Store Connect (iOS) and Google Play Console (Android).
 */
export const IAP_PRODUCTS: { productId: string; amountGhs: number; label: string }[] = [
  { productId: 'betrollover_ghs_10', amountGhs: 10, label: 'GHS 10' },
  { productId: 'betrollover_ghs_50', amountGhs: 50, label: 'GHS 50' },
  { productId: 'betrollover_ghs_100', amountGhs: 100, label: 'GHS 100' },
  { productId: 'betrollover_ghs_200', amountGhs: 200, label: 'GHS 200' },
  { productId: 'betrollover_ghs_500', amountGhs: 500, label: 'GHS 500' },
];

const PRODUCT_MAP = new Map(IAP_PRODUCTS.map((p) => [p.productId, p]));

export function getIapProduct(productId: string) {
  return PRODUCT_MAP.get(productId);
}

export function getIapProducts() {
  return IAP_PRODUCTS;
}
