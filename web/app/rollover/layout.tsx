import type { Metadata } from 'next';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { FaqJsonLd } from '@/components/FaqJsonLd';
import { getLocale, buildT } from '@/lib/i18n';
import { metaKeywordsFromTranslation } from '@/lib/seo/meta-keywords';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = buildT(locale);
  const title = t('seo.rollover_title');
  const description = t('seo.rollover_desc');
  return {
    title,
    description,
    keywords: metaKeywordsFromTranslation(t('seo.rollover_keywords')),
    alternates: seoAlternates('/rollover', locale),
    openGraph: {
      url: localizedUrl('/rollover', locale),
      title,
      description,
      type: 'website',
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

export default async function RolloverLayout({ children }: { children: React.ReactNode }) {
  const t = buildT(await getLocale());
  const faqs = [
    { question: t('seo.rollover_faq_1_q'), answer: t('seo.rollover_faq_1_a') },
    { question: t('seo.rollover_faq_2_q'), answer: t('seo.rollover_faq_2_a') },
    { question: t('seo.rollover_faq_3_q'), answer: t('seo.rollover_faq_3_a') },
    { question: t('seo.rollover_faq_4_q'), answer: t('seo.rollover_faq_4_a') },
  ];

  return (
    <>
      <FaqJsonLd faqs={faqs} />
      {children}
    </>
  );
}
