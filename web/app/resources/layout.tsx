import type { Metadata } from 'next';
import { SITE_URL, getAlternates } from '@/lib/site-config';
import { getLocale, serverT } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: serverT('seo.resources_title', locale),
    description: serverT('seo.resources_desc', locale),
    alternates: {
      canonical: `${SITE_URL}/resources`,
      languages: getAlternates('/resources'),
    },
    openGraph: {
      url: `${SITE_URL}/resources`,
      title: serverT('seo.resources_title', locale),
      description: serverT('seo.resources_desc', locale),
    },
  };
}

export default function ResourcesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
