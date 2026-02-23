import type { Metadata } from 'next';
import { SITE_URL, getAlternates } from '@/lib/site-config';
import { getLocale, serverT } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: serverT('seo.discover_title', locale),
    description: serverT('seo.discover_desc', locale),
    alternates: {
      canonical: `${SITE_URL}/discover`,
      languages: getAlternates('/discover'),
    },
    openGraph: {
      url: `${SITE_URL}/discover`,
      title: serverT('seo.discover_title', locale),
      description: serverT('seo.discover_desc', locale),
    },
  };
}

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return children;
}
