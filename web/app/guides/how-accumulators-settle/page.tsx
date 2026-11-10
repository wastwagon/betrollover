import type { Metadata } from 'next';
import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { PageHeader } from '@/components/PageHeader';
import { FaqJsonLd } from '@/components/FaqJsonLd';
import { DiscoverFamilyNav } from '@/components/DiscoverFamilyNav';
import { EducationRelatedLinks } from '@/components/EducationRelatedLinks';
import { GuideFaqList, GuidePanel, GuideStack, GuideStep } from '@/components/education/GuideChrome';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { getLocale, buildT } from '@/lib/i18n';
import { metaKeywordsFromTranslation } from '@/lib/seo/meta-keywords';

const GUIDE_PATH = '/guides/how-accumulators-settle';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = buildT(locale);
  const title = t('guides.acca_meta_title');
  const description = t('guides.acca_meta_desc');
  return {
    title,
    description,
    keywords: metaKeywordsFromTranslation(t('guides.acca_meta_keywords')),
    alternates: seoAlternates(GUIDE_PATH, locale),
    openGraph: {
      url: localizedUrl(GUIDE_PATH, locale),
      title,
      description,
    },
  };
}

export default async function HowAccumulatorsSettleGuidePage() {
  const locale = await getLocale();
  const t = buildT(locale);
  const faqs = [
    { question: t('guides.acca_faq_q1'), answer: t('guides.acca_faq_a1') },
    { question: t('guides.acca_faq_q2'), answer: t('guides.acca_faq_a2') },
    { question: t('guides.acca_faq_q3'), answer: t('guides.acca_faq_a3') },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <FaqJsonLd faqs={faqs} />
      <UnifiedHeader />
      <main className="section-ux-page-narrow w-full min-w-0">
        <PageHeader
          label={t('guides.acca_label')}
          title={t('guides.acca_title')}
          tagline={t('guides.acca_tagline')}
        />
        <DiscoverFamilyNav current="guides" />
        <EducationRelatedLinks current="acca" />
        <GuideStack>
          <GuidePanel>
            <p className="text-[15px] leading-relaxed text-[var(--text-muted)]">{t('guides.acca_intro')}</p>
          </GuidePanel>
          <GuideStep index="1" title={t('guides.acca_legs_h')}>
            <p>{t('guides.acca_legs_body')}</p>
          </GuideStep>
          <GuideStep index="2" title={t('guides.acca_win_h')}>
            <p>{t('guides.acca_win_body')}</p>
          </GuideStep>
          <GuideStep index="3" title={t('guides.acca_void_h')}>
            <p>{t('guides.acca_void_body')}</p>
          </GuideStep>
          <GuideStep index="4" title={t('guides.acca_refund_h')}>
            <p>
              {t('guides.acca_refund_before')}{' '}
              <Link href="/guides/purchase-protection">{t('guides.acca_refund_link')}</Link>.
            </p>
          </GuideStep>
          <GuideFaqList title={t('how_it_works.faq_title')} faqs={faqs} />
        </GuideStack>
      </main>
      <AppFooter />
    </div>
  );
}
