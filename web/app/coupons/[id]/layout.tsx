import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL, getAlternates } from '@/lib/site-config';
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

  const coupon = await fetchPublicCouponMeta(id, { revalidate: 120 });
  const canonical = `${SITE_URL}/coupons/${id}`;

  if (!coupon) {
    return {
      title: `Football pick #${id} — ${SITE_NAME}`,
      description:
        'View this football tipster pick on BetRollover. Sign in if the slip is premium or not yet public.',
      alternates: {
        canonical,
        languages: getAlternates(`/coupons/${id}`),
      },
      robots: { index: false, follow: true },
    };
  }

  const title = couponMetaTitle(coupon);
  const description = couponMetaDescription(coupon);

  return {
    title: `${title} — ${SITE_NAME}`,
    description,
    alternates: {
      canonical,
      languages: getAlternates(`/coupons/${id}`),
    },
    openGraph: {
      type: 'website',
      url: canonical,
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
