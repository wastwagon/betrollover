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
import { fetchSellingThresholds } from '@/lib/selling-thresholds';

const GUIDE_PATH = '/guides/free-and-paid-picks';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = buildT(locale);
  const th = await fetchSellingThresholds({ revalidate: 300 });
  const vars = { minRoi: String(th.minimumROI), minWr: String(th.minimumWinRate) };
  const title = t('guides.free_meta_title');
  const description = t('guides.free_meta_desc', vars);
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

export default async function FreeAndPaidPicksGuidePage() {
  const locale = await getLocale();
  const t = buildT(locale);
  const th = await fetchSellingThresholds({ revalidate: 300 });
  const vars = { minRoi: String(th.minimumROI), minWr: String(th.minimumWinRate) };
  const faqs = [
    { question: t('guides.free_faq_q1'), answer: t('guides.free_faq_a1') },
    { question: t('guides.free_faq_q2'), answer: t('guides.free_faq_a2') },
    { question: t('guides.free_faq_q3'), answer: t('guides.free_faq_a3', vars) },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <FaqJsonLd faqs={faqs} />
      <UnifiedHeader />
      <main className="section-ux-page-narrow w-full min-w-0">
        <PageHeader
          label={t('guides.free_label')}
          title={t('guides.free_title')}
          tagline={t('guides.free_tagline')}
        />
        <DiscoverFamilyNav current="guides" />
        <EducationRelatedLinks current="free" />
        <GuideStack>
          <GuidePanel>
            <p className="text-[15px] leading-relaxed text-[var(--text-muted)]">{t('guides.free_intro')}</p>
          </GuidePanel>
          <GuideStep index="1" title={t('guides.free_free_h')}>
            <p>{t('guides.free_free_body')}</p>
          </GuideStep>
          <GuideStep index="2" title={t('guides.free_paid_h')}>
            <p>
              {t('guides.free_paid_body')}{' '}
              <Link href="/guides/purchase-protection">{t('guides.acca_refund_link')}</Link>.
            </p>
          </GuideStep>
          <GuideStep index="3" title={t('guides.free_record_h')}>
            <p>
              {t('guides.free_record_body')}{' '}
              <Link href="/guides/read-tipster-stats">{t('guides.stats_card_title')}</Link>.
            </p>
          </GuideStep>
          <GuideStep index="4" title={t('guides.free_price_h')}>
            <p>{t('guides.free_price_body', vars)}</p>
          </GuideStep>
          <GuideFaqList title={t('how_it_works.faq_title')} faqs={faqs} />
        </GuideStack>
      </main>
      <AppFooter />
    </div>
  );
}
