import type { Metadata } from 'next';
import { SITE_URL, getAlternates } from '@/lib/site-config';
import { getLocale } from '@/lib/i18n';
import { fetchResourceItemForSeo, truncateMetaDescription } from '@/lib/seo/public-content';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { category: categorySlug, slug: itemSlug } = await params;
  const locale = await getLocale();
  const item = await fetchResourceItemForSeo(categorySlug, itemSlug, locale);

  if (!item?.category?.slug) {
    return {
      title: 'Resource not found',
      robots: { index: false, follow: true },
    };
  }

  const cat = item.category.slug;
  const itemLang = (item.language ?? locale).toLowerCase().slice(0, 5);
  const isFrContent = itemLang === 'fr';
  const path = `/resources/${cat}/${item.slug}`;
  const canonical = isFrContent ? `${SITE_URL}/fr${path}` : `${SITE_URL}${path}`;
  const description = truncateMetaDescription(item.excerpt?.trim() || item.title);
  const ogImage = `${SITE_URL}/og-image.png`;

  return {
    title: item.title,
    description,
    alternates: {
      canonical,
      languages: getAlternates(path),
    },
    openGraph: {
      type: 'article',
      url: canonical,
      title: item.title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: item.title }],
      publishedTime: item.publishedAt || undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: item.title,
      description,
      images: [ogImage],
    },
  };
}

export default function ResourceItemSegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
