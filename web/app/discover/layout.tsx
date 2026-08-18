import type { Metadata } from 'next';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { getLocale, serverT } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: serverT('seo.discover_title', locale),
    description: serverT('seo.discover_desc', locale),
    alternates: seoAlternates('/discover', locale),
    openGraph: {
      url: localizedUrl('/discover', locale),
      title: serverT('seo.discover_title', locale),
      description: serverT('seo.discover_desc', locale),
    },
    robots: { index: false, follow: true },
  };
}

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return children;
}
