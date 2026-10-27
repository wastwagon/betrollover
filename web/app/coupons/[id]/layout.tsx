import type { Metadata } from 'next';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { getLocale } from '@/lib/i18n';
import {
  couponMetaDescription,
  couponMetaTitle,
  fetchPublicCouponMeta,
} from '@/lib/seo/public-content';

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
        'View this football tipster pick on BetRollover. Sign in if the slip is premium or not yet public.',
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

export default function CouponDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
