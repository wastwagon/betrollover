import type { Metadata } from 'next';
import { localizedUrl, seoAlternates, SITE_URL } from '@/lib/site-config';
import { getLocale } from '@/lib/i18n';
import {
  couponDisplayTitle,
  couponMetaDescription,
  couponMetaTitle,
  fetchPublicCouponMeta,
} from '@/lib/seo/public-content';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';
import { PaywalledContentJsonLd } from '@/components/seo/PaywalledContentJsonLd';
import { ProductOfferJsonLd } from '@/components/seo/ProductOfferJsonLd';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: raw } = await params;
  const id = parseInt(raw, 10);
  if (!Number.isFinite(id)) {
    return { title: 'Pick not found', robots: { index: false, follow: true } };
  }

  const locale = await getLocale();
  const coupon = await fetchPublicCouponMeta(id, { revalidate: 120 });
  const path = `/coupons/${id}`;
  const canonical = localizedUrl(path, locale);

  if (!coupon) {
    const alternates = seoAlternates(path, locale);
    return {
      title: `Football pick #${id}`,
      description:
        'View this football tipster pick on BetRollover. Public preview shows teams and odds; buy or sign in for full details.',
      alternates,
      openGraph: { url: alternates.canonical },
      robots: { index: false, follow: true },
    };
  }

  const title = couponMetaTitle(coupon);
  const description = couponMetaDescription(coupon);

  const alternates = seoAlternates(path, locale);

  return {
    title,
    description,
    alternates,
    openGraph: {
      type: 'website',
      url: alternates.canonical ?? canonical,
      title,
      description,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function CouponDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id: raw } = await params;
  const id = parseInt(raw, 10);
  const locale = await getLocale();
  const path = Number.isFinite(id) ? `/coupons/${id}` : '/coupons';
  const pageUrl = localizedUrl(path, locale);

  const coupon = Number.isFinite(id) ? await fetchPublicCouponMeta(id, { revalidate: 120 }) : null;
  const title = coupon ? couponDisplayTitle(coupon) : `Pick #${raw}`;
  const price = coupon?.price != null ? Number(coupon.price) : NaN;
  const paid = Number.isFinite(price) && price > 0;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: localizedUrl('/', locale) },
          { name: 'Marketplace', url: localizedUrl('/marketplace', locale) },
          { name: title, url: pageUrl },
        ]}
      />
      {paid && coupon ? (
        <ProductOfferJsonLd
          items={[
            {
              name: title,
              description: couponMetaDescription(coupon),
              price,
              currency: 'GHS',
              url: `${SITE_URL.replace(/\/$/, '')}${path}`,
            },
          ]}
        />
      ) : null}
      {coupon && (paid || coupon.requiresSubscription === true) ? (
        <PaywalledContentJsonLd url={pageUrl} headline={title} />
      ) : null}
      {children}
    </>
  );
}
