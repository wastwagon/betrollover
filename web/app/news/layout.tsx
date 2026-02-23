import type { Metadata } from 'next';
import { SITE_URL, getAlternates } from '@/lib/site-config';
import { getLocale, serverT } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: serverT('seo.news_title', locale),
    description: serverT('seo.news_desc', locale),
    alternates: {
      canonical: `${SITE_URL}/news`,
      languages: getAlternates('/news'),
    },
    openGraph: {
      url: `${SITE_URL}/news`,
      title: serverT('seo.news_title', locale),
      description: serverT('seo.news_desc', locale),
    },
  };
}

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
