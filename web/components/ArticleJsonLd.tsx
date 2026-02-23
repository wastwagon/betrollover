import { SITE_URL } from '@/lib/site-config';

interface ArticleJsonLdProps {
  title: string;
  excerpt?: string | null;
  imageUrl?: string | null;
  publishedAt?: string | null;
  slug: string;
  author?: string;
}

export function ArticleJsonLd({ title, excerpt, imageUrl, publishedAt, slug, author }: ArticleJsonLdProps) {
  const url = `${SITE_URL}/news/${slug}`;
  const image = imageUrl?.startsWith('http') ? imageUrl : imageUrl ? `${SITE_URL}${imageUrl}` : `${SITE_URL}/og-image.png`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: excerpt || title,
    image: image,
    datePublished: publishedAt || undefined,
    dateModified: publishedAt || undefined,
    author: author
      ? { '@type': 'Person', name: author }
      : { '@type': 'Organization', name: 'BetRollover', url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'BetRollover',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/BetRollover-logo.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
