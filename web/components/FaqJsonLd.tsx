'use client';

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqJsonLdProps {
  faqs: FaqItem[];
}

/**
 * FAQPage structured data for rich results in search (e.g. FAQ expandable snippets).
 */
export function FaqJsonLd({ faqs }: FaqJsonLdProps) {
  if (!faqs?.length) return null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
