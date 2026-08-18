import type { Metadata } from 'next';
import { ArticleJsonLd } from '@/components/ArticleJsonLd';
import { getAlternates, localizedUrl } from '@/lib/site-config';
import { getLocale } from '@/lib/i18n';
import {
  fetchNewsArticleBySlug,
  newsOgImageUrl,
  truncateMetaDescription,
} from '@/lib/seo/public-content';

function newsCanonical(slug: string, articleLang: string) {
  return localizedUrl(`/news/${slug}`, articleLang === 'fr' ? 'fr' : 'en');
}

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
  const canonical = newsCanonical(slug, articleLang);
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

export default async function NewsArticleSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const article = await fetchNewsArticleBySlug(slug, locale);
  const articleLang = (article?.language ?? locale).toLowerCase().slice(0, 5);

  return (
    <>
      {article && (
        <ArticleJsonLd
          title={article.title}
          excerpt={article.excerpt}
          imageUrl={article.imageUrl}
          publishedAt={article.publishedAt}
          slug={article.slug}
          url={newsCanonical(slug, articleLang)}
        />
      )}
      {children}
    </>
  );
}
