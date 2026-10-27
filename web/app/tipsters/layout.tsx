import type { Metadata } from 'next';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { getLocale, serverT } from '@/lib/i18n';
import { metaKeywordsFromTranslation } from '@/lib/seo/meta-keywords';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = serverT('seo.tipsters_title', locale);
  const description = serverT('seo.tipsters_desc', locale);
  return {
    title,
    description,
    keywords: metaKeywordsFromTranslation(serverT('seo.tipsters_keywords', locale)),
    alternates: seoAlternates('/tipsters', locale),
    openGraph: {
      url: localizedUrl('/tipsters', locale),
      title,
      description,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'BetRollover Verified Tipsters' }],
    },
  };
}

export default function TipstersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
