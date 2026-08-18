import { HubCrawlLinks } from '@/components/seo/HubCrawlLinks';
import { getLocale } from '@/lib/i18n';
import { fetchPublicCouponMeta } from '@/lib/seo/public-content';
import CouponDetailClient from './CouponDetailClient';

export default async function CouponDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: raw } = await params;
  const id = parseInt(raw, 10);
  const locale = await getLocale();
  const coupon = Number.isFinite(id) ? await fetchPublicCouponMeta(id, { revalidate: 60 }) : null;
  const username = coupon?.tipster?.username?.trim();

  return (
    <>
      {username ? (
        <HubCrawlLinks
          locale={locale}
          label="Tipster"
          links={[{ href: `/tipsters/${username}`, text: coupon?.tipster?.displayName || username }]}
        />
      ) : null}
      <CouponDetailClient initialCoupon={coupon as Record<string, unknown> | null} />
    </>
  );
}
