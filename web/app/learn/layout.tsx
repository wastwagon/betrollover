import type { Metadata } from 'next';
import { SITE_URL, SITE_NAME, getAlternates } from '@/lib/site-config';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Learn | Tipster Glossary, How to Evaluate Picks & Use the Marketplace | ${SITE_NAME}`,
    description:
      'Learn how tipster marketplaces work: escrow, ROI, win rate, and settlement. Glossary of key terms. How to evaluate tipsters and get the most from verified sports picks. Educational guide.',
    alternates: {
      canonical: `${SITE_URL}/learn`,
      languages: getAlternates('/learn'),
    },
    openGraph: {
      url: `${SITE_URL}/learn`,
      title: `Learn | Tipster Glossary & How to Use the Platform | ${SITE_NAME}`,
      description: 'Glossary, how to evaluate tipsters, and how to use the marketplace. Escrow, ROI, win rate explained.',
    },
  };
}

const learnPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Learn: Tipster Marketplace Glossary & How to Use the Platform',
  description: 'Glossary of key terms (escrow, ROI, win rate, settlement), how to evaluate tipsters, and how to get the most from the marketplace. Educational guide for verified sports picks.',
  url: `${SITE_URL}/learn`,
  publisher: {
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: { '@type': 'ImageObject', url: `${SITE_URL}/BetRollover-logo.png` },
  },
  mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/learn` },
};

export default function LearnLayout({ children }: { children: React.ReactNode }) {
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
