import type { Metadata } from 'next';
import { SITE_NAME, localizedUrl, seoAlternates } from '@/lib/site-config';
import { getLocale, serverT } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = serverT('seo.login_title', locale);
  const description = serverT('seo.login_desc', locale);
  return {
    title,
    description,
    alternates: seoAlternates('/login', locale),
    openGraph: {
      url: localizedUrl('/login', locale),
      siteName: SITE_NAME,
      title,
      description,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: `${SITE_NAME} — sign in` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [{ url: '/og-image.png', alt: `${SITE_NAME} — sign in` }],
    },
    robots: { index: false, follow: true },
  };
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
