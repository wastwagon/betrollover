import type { Metadata } from 'next';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { getLocale, buildT } from '@/lib/i18n';

const PATH = '/subscriptions/marketplace';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = buildT(locale);
  const title = t('seo.vip_title');
  const description = t('seo.vip_desc');
  return {
    title,
    description,
    keywords: [
      'VIP football tips',
      'football tipster subscription',
      'subscribe to football tipster',
      'paid football predictions',
    ],
    alternates: seoAlternates(PATH, locale),
    openGraph: {
      url: localizedUrl(PATH, locale),
      title,
      description,
      type: 'website',
    },
  };
}

export default function SubscriptionMarketplaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
