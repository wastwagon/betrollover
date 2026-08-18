import type { Metadata } from 'next';
import { seoAlternates, localizedUrl } from '@/lib/site-config';
import { getLocale, serverT } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: serverT('seo.picks_archive_title', locale),
    description: serverT('seo.picks_archive_desc', locale),
    alternates: seoAlternates('/coupons/archive', locale),
    openGraph: {
      url: localizedUrl('/coupons/archive', locale),
      title: serverT('seo.picks_archive_title', locale),
      description: serverT('seo.picks_archive_desc', locale),
    },
  };
}

export default function CouponsArchiveLayout({ children }: { children: React.ReactNode }) {
  return children;
}
