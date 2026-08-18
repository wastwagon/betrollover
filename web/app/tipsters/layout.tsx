import type { Metadata } from 'next';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { getLocale, serverT } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: serverT('seo.tipsters_title', locale),
    description: serverT('seo.tipsters_desc', locale),
    alternates: seoAlternates('/tipsters', locale),
    openGraph: {
      url: localizedUrl('/tipsters', locale),
      title: serverT('seo.tipsters_title', locale),
      description: serverT('seo.tipsters_desc', locale),
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'BetRollover Verified Tipsters' }],
    },
  };
}

export default function TipstersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
