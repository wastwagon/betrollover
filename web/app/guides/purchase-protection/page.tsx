import type { Metadata } from 'next';
import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { PageHeader } from '@/components/PageHeader';
import { FaqJsonLd } from '@/components/FaqJsonLd';
import { DiscoverFamilyNav } from '@/components/DiscoverFamilyNav';
import { EducationRelatedLinks } from '@/components/EducationRelatedLinks';
import { GuideCallout, GuideFaqList, GuideStack, GuideStep } from '@/components/education/GuideChrome';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { getLocale, buildT } from '@/lib/i18n';

const GUIDE_PATH = '/guides/purchase-protection';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = buildT(locale);
  const title = t('guides.escrow_meta_title');
  const description = t('guides.escrow_meta_desc');
  return {
    title,
    description,
    alternates: seoAlternates(GUIDE_PATH, locale),
    openGraph: {
      url: localizedUrl(GUIDE_PATH, locale),
      title,
      description,
    },
  };
}

export default async function PurchaseProtectionGuidePage() {
  const locale = await getLocale();
  const t = buildT(locale);
  const faqs = [
    { question: t('guides.escrow_faq_q1'), answer: t('guides.escrow_faq_a1') },
    { question: t('guides.escrow_faq_q2'), answer: t('guides.escrow_faq_a2') },
    { question: t('guides.escrow_faq_q3'), answer: t('guides.escrow_faq_a3') },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <FaqJsonLd faqs={faqs} />
      <UnifiedHeader />
      <main className="section-ux-page-narrow w-full min-w-0">
        <PageHeader
          label={t('guides.escrow_label')}
          title={t('guides.escrow_title')}
          tagline={t('guides.escrow_tagline')}
        />
        <DiscoverFamilyNav current="guides" />
        <EducationRelatedLinks current="escrow" />
        <GuideStack>
          <GuideStep index="1" title={t('guides.escrow_s1_title')}>
            <p>{t('guides.escrow_s1_body')}</p>
          </GuideStep>
          <GuideStep index="2" title={t('guides.escrow_s2_title')}>
            <p>{t('guides.escrow_s2_body')}</p>
          </GuideStep>
          <GuideStep index="3" title={t('guides.escrow_s3_title')}>
            <p>
              {t('guides.escrow_s3_body_before')}{' '}
              <Link href="/wallet">{t('nav.wallet')}</Link> {t('guides.escrow_s3_body_and')}{' '}
              <Link href="/my-purchases">{t('nav.purchases')}</Link>.
            </p>
          </GuideStep>
          <GuideStep index="4" title={t('guides.escrow_s4_title')}>
            <p>{t('guides.escrow_s4_body')}</p>
          </GuideStep>
          <GuideCallout>{t('guides.escrow_callout')}</GuideCallout>
          <GuideFaqList title={t('how_it_works.faq_title')} faqs={faqs} />
        </GuideStack>
      </main>
      <AppFooter />
    </div>
  );
}
