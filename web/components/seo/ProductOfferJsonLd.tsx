/** Product + Offer JSON-LD for VIP plans and paid picks (not gambling services). */

export type ProductOfferJsonLdItem = {
  name: string;
  description: string;
  price: number;
  currency?: string;
  url: string;
  availability?: 'InStock' | 'SoldOut' | 'PreOrder';
};

export function ProductOfferJsonLd({ items }: { items: ProductOfferJsonLdItem[] }) {
  if (!items.length) return null;
  const graph = items.map((item) => ({
    '@type': 'Product',
    name: item.name,
    description: item.description,
    url: item.url,
    category: 'Football tipster prediction',
    offers: {
      '@type': 'Offer',
      price: Number(item.price).toFixed(2),
      priceCurrency: item.currency || 'GHS',
      availability: `https://schema.org/${item.availability || 'InStock'}`,
      url: item.url,
    },
  }));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': graph,
        }),
      }}
    />
  );
}
