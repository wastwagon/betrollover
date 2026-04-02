import type { Metadata } from 'next';
import { SITE_URL, SITE_NAME, getAlternates } from '@/lib/site-config';
import { getLocale, serverT } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = serverT('seo.login_title', locale);
  const description = serverT('seo.login_desc', locale);
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/login`,
      languages: getAlternates('/login'),
    },
    openGraph: {
      url: `${SITE_URL}/login`,
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
  };
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
