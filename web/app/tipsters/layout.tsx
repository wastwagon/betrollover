import type { Metadata } from 'next';
import { SITE_URL, getAlternates } from '@/lib/site-config';
import { getLocale, serverT } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: serverT('seo.tipsters_title', locale),
    description: serverT('seo.tipsters_desc', locale),
    alternates: {
      canonical: `${SITE_URL}/tipsters`,
      languages: getAlternates('/tipsters'),
    },
    openGraph: {
      url: `${SITE_URL}/tipsters`,
      title: serverT('seo.tipsters_title', locale),
      description: serverT('seo.tipsters_desc', locale),
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'BetRollover Verified Tipsters' }],
    },
  };
}

export default function TipstersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
