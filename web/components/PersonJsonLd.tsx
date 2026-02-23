import { SITE_URL, getAvatarUrl } from '@/lib/site-config';

interface PersonJsonLdProps {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  winRate?: number;
  totalPredictions?: number;
}

export function PersonJsonLd({
  username,
  displayName,
  avatarUrl,
  bio,
  winRate,
  totalPredictions,
}: PersonJsonLdProps) {
  const url = `${SITE_URL}/tipsters/${username}`;
  const avatarPath = getAvatarUrl(avatarUrl, 512);
  const image = avatarPath?.startsWith('http') ? avatarPath : avatarPath ? `${SITE_URL}${avatarPath}` : `${SITE_URL}/BetRollover-logo.png`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: displayName,
    url,
    image,
    description: bio || `Verified sports tipster on BetRollover. Win rate: ${winRate ?? 0}%. Total predictions: ${totalPredictions ?? 0}.`,
    sameAs: [],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
