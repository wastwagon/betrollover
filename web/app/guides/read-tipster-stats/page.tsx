import type { Metadata } from 'next';
import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { PageHeader } from '@/components/PageHeader';
import { FaqJsonLd } from '@/components/FaqJsonLd';
import { DiscoverFamilyNav } from '@/components/DiscoverFamilyNav';
import { EducationRelatedLinks } from '@/components/EducationRelatedLinks';
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
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-7 text-[var(--text)]">
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">{t('guides.stats_intro')}</p>

          <h2 className="text-lg font-semibold mt-6">{t('guides.stats_roi_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{t('guides.stats_roi_body')}</p>

          <h2 className="text-lg font-semibold mt-6">{t('guides.stats_win_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{t('guides.stats_win_body')}</p>

          <h2 className="text-lg font-semibold mt-6">{t('guides.stats_streak_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{t('guides.stats_streak_body')}</p>

          <h2 className="text-lg font-semibold mt-6">{t('guides.stats_where_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            {t('guides.stats_where_before')}{' '}
            <Link href="/tipsters" className="text-[var(--primary)] hover:underline">
              {t('guides.eval_profiles')}
            </Link>{' '}
            {t('guides.stats_where_mid')}{' '}
            <Link href="/coupons/archive" className="text-[var(--primary)] hover:underline">
              {t('guides.eval_archive')}
            </Link>{' '}
            {t('guides.stats_where_after')}
          </p>

          <h2 className="text-lg font-semibold mt-6">{t('how_it_works.faq_title')}</h2>
          <dl className="mt-3 space-y-4">
            {faqs.map((faq) => (
              <div key={faq.question}>
                <dt className="text-sm font-semibold">{faq.question}</dt>
                <dd className="mt-1 text-sm text-[var(--text-muted)] leading-relaxed">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </article>
      </main>
      <AppFooter />
    </div>
  );
}
