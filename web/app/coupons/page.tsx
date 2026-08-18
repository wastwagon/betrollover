import { permanentRedirect } from 'next/navigation';

/**
 * /coupons is consolidated into /marketplace.
 * Individual pick detail: /coupons/[id]
 * Settled history: /coupons/archive
 */
export default async function CouponsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sport = params?.sport;
  const dest = sport ? `/marketplace?sport=${sport}` : '/marketplace';
  permanentRedirect(dest);
}
