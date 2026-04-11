import type { Metadata } from 'next';
import { SITE_URL, getAlternates } from '@/lib/site-config';
import { getLocale, serverT } from '@/lib/i18n';
import {
  fetchTipsterProfileForSeo,
  tipsterOgImageUrl,
  truncateMetaDescription,
} from '@/lib/seo/public-content';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const locale = await getLocale();
  const profile = await fetchTipsterProfileForSeo(username);

  if (!profile?.tipster) {
    return {
      title: serverT('tipster.not_found', locale),
      robots: { index: false, follow: true },
    };
  }

  const tip = profile.tipster;
  const title = `${tip.display_name} (@${tip.username})`;
  const statsLine = `${Number(tip.win_rate).toFixed(1)}% ${serverT('tipster.win_rate', locale)} · ${Number(tip.roi).toFixed(1)}% ROI`;
  const description = truncateMetaDescription(
    tip.bio?.trim() || `${statsLine} · ${tip.total_predictions} ${serverT('tipster.predictions', locale)}`,
  );
  const canonical = `${SITE_URL}/tipsters/${encodeURIComponent(tip.username)}`;
  const ogImage = tipsterOgImageUrl(tip.avatar_url);

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: getAlternates(`/tipsters/${tip.username}`),
    },
    openGraph: {
      url: canonical,
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default function TipsterUsernameLayout({ children }: { children: React.ReactNode }) {
  return children;
}
