import type { Metadata } from 'next';
import { SeoHubLayout } from '@/components/seo/SeoHubLayout';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { getLocale } from '@/lib/i18n';
import { metaKeywordsFromTranslation } from '@/lib/seo/meta-keywords';
import { phase3Hub, type Phase3HubKey } from '@/lib/seo/phase3-hubs';
import { fetchPhase3LivePicks } from '@/lib/seo/phase3-live-picks';

export function phase3GenerateMetadata(key: Phase3HubKey) {
  return async function generateMetadata(): Promise<Metadata> {
    const locale = await getLocale();
    const hub = phase3Hub(key);
    return {
      title: hub.metaTitle,
      description: hub.metaDescription,
      keywords: metaKeywordsFromTranslation(hub.keywords.join('|')),
      robots: {
        index: true,
        follow: true,
        googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
      },
      alternates: seoAlternates(hub.path, locale),
      openGraph: {
        url: localizedUrl(hub.path, locale),
        title: hub.metaTitle,
        description: hub.metaDescription,
        type: 'website',
        images: [{ url: '/og-image.png', width: 1200, height: 630, alt: hub.metaTitle }],
      },
      twitter: {
        card: 'summary_large_image',
        title: hub.metaTitle,
        description: hub.metaDescription,
      },
    };
  };
}

export async function Phase3HubPageContent({ hubKey }: { hubKey: Phase3HubKey }) {
  const locale = await getLocale();
  const hub = phase3Hub(hubKey);
  const liveItems = await fetchPhase3LivePicks(hub.liveQuery, 8);

  return (
    <SeoHubLayout
      path={hub.path}
      locale={locale}
      label={hub.label}
      title={hub.title}
      tagline={hub.tagline}
      intro={hub.intro}
      sections={hub.sections}
      faqs={hub.faqs}
      ctaPrimary={hub.ctaPrimary}
      ctaSecondary={hub.ctaSecondary}
      disclaimer={hub.disclaimer}
      live={{
        heading: hub.liveHeading,
        empty: hub.liveEmpty,
        items: liveItems,
        moreHref: hub.liveMoreHref,
        moreLabel: hub.liveMoreLabel,
      }}
    />
  );
}
