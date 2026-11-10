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

const GUIDE_PATH = '/guides/ghana-free-tips-vs-protected';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = buildT(locale);
  const title = t('guides.ghana_vs_meta_title');
  const description = t('guides.ghana_vs_meta_desc');
  return {
    title,
    description,
    keywords: metaKeywordsFromTranslation(t('guides.ghana_vs_meta_keywords')),
    robots: { index: true, follow: true },
    alternates: seoAlternates(GUIDE_PATH, locale),
    openGraph: {
      url: localizedUrl(GUIDE_PATH, locale),
      title,
      description,
    },
  };
}

export default async function GhanaFreeTipsVsProtectedGuidePage() {
  const locale = await getLocale();
  const t = buildT(locale);
  const faqs = [
    { question: t('guides.ghana_vs_faq_q1'), answer: t('guides.ghana_vs_faq_a1') },
    { question: t('guides.ghana_vs_faq_q2'), answer: t('guides.ghana_vs_faq_a2') },
    { question: t('guides.ghana_vs_faq_q3'), answer: t('guides.ghana_vs_faq_a3') },
    { question: t('guides.ghana_vs_faq_q4'), answer: t('guides.ghana_vs_faq_a4') },
    { question: t('guides.ghana_vs_faq_q5'), answer: t('guides.ghana_vs_faq_a5') },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <FaqJsonLd faqs={faqs} />
      <UnifiedHeader />
      <main className="section-ux-page-narrow w-full min-w-0">
        <PageHeader
          label={t('guides.ghana_vs_label')}
          title={t('guides.ghana_vs_title')}
          tagline={t('guides.ghana_vs_tagline')}
        />
        <DiscoverFamilyNav current="guides" />
        <EducationRelatedLinks current="ghana_vs" />
        <GuideStack>
          <GuidePanel>
            <p className="text-[15px] leading-relaxed text-[var(--text-muted)]">{t('guides.ghana_vs_intro')}</p>
          </GuidePanel>
          <GuideStep index="1" title={t('guides.ghana_vs_free_h')}>
            <p>{t('guides.ghana_vs_free_body')}</p>
          </GuideStep>
          <GuideStep index="2" title={t('guides.ghana_vs_affiliate_h')}>
            <p>{t('guides.ghana_vs_affiliate_body')}</p>
          </GuideStep>
          <GuideStep index="3" title={t('guides.ghana_vs_protected_h')}>
            <p>
              {t('guides.ghana_vs_protected_body')}{' '}
              <Link href="/guides/purchase-protection">{t('guides.escrow_short')}</Link>
              {' · '}
              <Link href="/track-record">{t('track_record.nav')}</Link>
            </p>
          </GuideStep>
          <GuideStep index="4" title={t('guides.ghana_vs_record_h')}>
            <p>
              {t('guides.ghana_vs_record_body')}{' '}
              <Link href="/coupons/archive">{t('header.settled_archive')}</Link>
            </p>
          </GuideStep>
          <GuideStep index="5" title={t('guides.ghana_vs_choose_h')}>
            <p>
              {t('guides.ghana_vs_choose_body')}{' '}
              <Link href="/football-tips-ghana">{t('footer.ghana_hub')}</Link>
              {' · '}
              <Link href="/marketplace">{t('nav.marketplace')}</Link>
            </p>
          </GuideStep>
          <GuideFaqList title={t('how_it_works.faq_title')} faqs={faqs} />
        </GuideStack>
      </main>
      <AppFooter />
    </div>
  );
}
