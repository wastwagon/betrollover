import type { Metadata } from 'next';
import { SITE_URL, getAlternates } from '@/lib/site-config';
import { getLocale, serverT } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: serverT('seo.coupons_title', locale),
    description: serverT('seo.coupons_desc', locale),
    alternates: {
      canonical: `${SITE_URL}/coupons`,
      languages: getAlternates('/coupons'),
    },
    openGraph: {
      url: `${SITE_URL}/coupons`,
      title: serverT('seo.coupons_title', locale),
      description: serverT('seo.coupons_desc', locale),
    },
  };
}

export default function CouponsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
