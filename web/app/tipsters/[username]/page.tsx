import TipsterProfileClient, { type TipsterProfile } from './TipsterProfileClient';
import { fetchTipsterProfilePublic } from '@/lib/seo/public-content';

export default async function TipsterProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const raw = await fetchTipsterProfilePublic(username, { revalidate: 120 });

  return (
    <TipsterProfileClient initialProfile={(raw as TipsterProfile | null) ?? null} />
  );
}
