/** Marks gated pick sections for search (Google paywalled content). */

type PaywalledContentJsonLdProps = {
  url: string;
  headline: string;
  /** CSS selectors for parts that stay behind sign-in / purchase. */
  cssSelectors?: string[];
};

export function PaywalledContentJsonLd({
  url,
  headline,
  cssSelectors = ['.pick-paywall', '.pick-reasoning-gate'],
}: PaywalledContentJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline,
    isAccessibleForFree: false,
    mainEntityOfPage: url,
    hasPart: cssSelectors.map((cssSelector) => ({
      '@type': 'WebPageElement',
      isAccessibleForFree: false,
      cssSelector,
    })),
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
