import type { Metadata } from 'next';
import { SITE_URL, getAlternates } from '@/lib/site-config';
import { getLocale } from '@/lib/i18n';
import {
  fetchNewsArticleBySlug,
  newsOgImageUrl,
  truncateMetaDescription,
} from '@/lib/seo/public-content';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const article = await fetchNewsArticleBySlug(slug, locale);

  if (!article) {
    return {
      title: 'Article not found',
      robots: { index: false, follow: true },
    };
  }

  const articleLang = (article.language ?? locale).toLowerCase().slice(0, 5);
  const isFrContent = articleLang === 'fr';
  const canonical = isFrContent ? `${SITE_URL}/fr/news/${slug}` : `${SITE_URL}/news/${slug}`;
  const description = truncateMetaDescription(article.excerpt?.trim() || article.title);
  const ogImage = newsOgImageUrl(article.imageUrl);

  return {
    title: article.title,
    description,
    alternates: {
      canonical,
      languages: getAlternates(`/news/${slug}`),
    },
    openGraph: {
      type: 'article',
      url: canonical,
      title: article.title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: article.title }],
      publishedTime: article.publishedAt || undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description,
      images: [ogImage],
    },
  };
}

export default function NewsArticleSlugLayout({ children }: { children: React.ReactNode }) {
  return children;
}
