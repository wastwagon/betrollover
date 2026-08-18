import { SITE_URL, getAvatarUrl, localizedUrl } from '@/lib/site-config';
import type { UrlLocale } from '@/lib/locale-path';

interface PersonJsonLdProps {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  winRate?: number;
  totalPredictions?: number;
  /** Absolute profile URL. Defaults to the English /tipsters/{username} page. */
  url?: string;
  locale?: UrlLocale;
}

export function PersonJsonLd({
  username,
  displayName,
  avatarUrl,
  bio,
  winRate,
  totalPredictions,
  url,
  locale = 'en',
}: PersonJsonLdProps) {
  const pageUrl = url || localizedUrl(`/tipsters/${username}`, locale);
  const avatarPath = getAvatarUrl(avatarUrl, 512);
  const image = avatarPath?.startsWith('http') ? avatarPath : avatarPath ? `${SITE_URL}${avatarPath}` : `${SITE_URL}/BetRollover-logo.png`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': `${pageUrl}#person`,
        name: displayName,
        url: pageUrl,
        image,
        description: bio || `Verified sports tipster on BetRollover. Win rate: ${winRate ?? 0}%. Total predictions: ${totalPredictions ?? 0}.`,
      },
      {
        '@type': 'ProfilePage',
        '@id': pageUrl,
        url: pageUrl,
        name: displayName,
        mainEntity: { '@id': `${pageUrl}#person` },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
