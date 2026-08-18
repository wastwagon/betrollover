import type { Metadata } from 'next';
import { SITE_URL, SITE_NAME, localizedUrl, seoAlternates } from '@/lib/site-config';
import { getLocale } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: 'Tipster Marketplace Glossary',
    description:
      'Definitions for escrow, ROI, win rate, and settlement on BetRollover. How-to pages live under Guides; match stories live under News.',
    alternates: seoAlternates('/learn', locale),
    openGraph: {
      url: localizedUrl('/learn', locale),
      title: 'Tipster Marketplace Glossary',
      description:
        'Escrow, ROI, win rate, and settlement terms. Educational copy — not betting advice.',
    },
  };
}

export default async function LearnLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const pageUrl = localizedUrl('/learn', locale);
  const learnPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Tipster Marketplace Glossary',
    description:
      'Glossary of escrow, ROI, win rate, and settlement on the BetRollover marketplace.',
    url: pageUrl,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL.replace(/\/$/, '')}/BetRollover-logo.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(learnPageJsonLd) }}
      />
      {children}
    </>
  );
}
