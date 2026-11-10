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

const GUIDE_PATH = '/guides/read-tipster-stats';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = buildT(locale);
  const title = t('guides.stats_meta_title');
  const description = t('guides.stats_meta_desc');
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

export default async function ReadTipsterStatsGuidePage() {
  const locale = await getLocale();
  const t = buildT(locale);
  const faqs = [
    { question: t('guides.stats_faq_q1'), answer: t('guides.stats_faq_a1') },
    { question: t('guides.stats_faq_q2'), answer: t('guides.stats_faq_a2') },
    { question: t('guides.stats_faq_q3'), answer: t('guides.stats_faq_a3') },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <FaqJsonLd faqs={faqs} />
      <UnifiedHeader />
      <main className="section-ux-page-narrow w-full min-w-0">
        <PageHeader
          label={t('guides.stats_label')}
          title={t('guides.stats_title')}
          tagline={t('guides.stats_tagline')}
        />
        <DiscoverFamilyNav current="guides" />
        <EducationRelatedLinks current="stats" />
        <GuideStack>
          <GuidePanel>
            <p className="text-[15px] leading-relaxed text-[var(--text-muted)]">{t('guides.stats_intro')}</p>
          </GuidePanel>
          <GuideStep index="1" title={t('guides.stats_roi_h')}>
            <p>{t('guides.stats_roi_body')}</p>
          </GuideStep>
          <GuideStep index="2" title={t('guides.stats_win_h')}>
            <p>{t('guides.stats_win_body')}</p>
          </GuideStep>
          <GuideStep index="3" title={t('guides.stats_streak_h')}>
            <p>{t('guides.stats_streak_body')}</p>
          </GuideStep>
          <GuideStep index="4" title={t('guides.stats_where_h')}>
            <p>
              {t('guides.stats_where_before')}{' '}
              <Link href="/tipsters">{t('guides.eval_profiles')}</Link>{' '}
              {t('guides.stats_where_mid')}{' '}
              <Link href="/coupons/archive">{t('guides.eval_archive')}</Link>{' '}
              {t('guides.stats_where_after')}
            </p>
          </GuideStep>
          <GuideFaqList title={t('how_it_works.faq_title')} faqs={faqs} />
        </GuideStack>
      </main>
      <AppFooter />
    </div>
  );
}
