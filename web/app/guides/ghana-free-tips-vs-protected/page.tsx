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
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-7 text-[var(--text)]">
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">{t('guides.ghana_vs_intro')}</p>

          <h2 className="text-lg font-semibold mt-6">{t('guides.ghana_vs_free_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{t('guides.ghana_vs_free_body')}</p>

          <h2 className="text-lg font-semibold mt-6">{t('guides.ghana_vs_affiliate_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{t('guides.ghana_vs_affiliate_body')}</p>

          <h2 className="text-lg font-semibold mt-6">{t('guides.ghana_vs_protected_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            {t('guides.ghana_vs_protected_body')}{' '}
            <Link href="/guides/purchase-protection" className="text-[var(--primary)] hover:underline">
              {t('guides.escrow_short')}
            </Link>
            {' · '}
            <Link href="/track-record" className="text-[var(--primary)] hover:underline">
              {t('track_record.nav')}
            </Link>
          </p>

          <h2 className="text-lg font-semibold mt-6">{t('guides.ghana_vs_record_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            {t('guides.ghana_vs_record_body')}{' '}
            <Link href="/coupons/archive" className="text-[var(--primary)] hover:underline">
              {t('header.settled_archive')}
            </Link>
          </p>

          <h2 className="text-lg font-semibold mt-6">{t('guides.ghana_vs_choose_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            {t('guides.ghana_vs_choose_body')}{' '}
            <Link href="/football-tips-ghana" className="text-[var(--primary)] hover:underline">
              {t('footer.ghana_hub')}
            </Link>
            {' · '}
            <Link href="/marketplace" className="text-[var(--primary)] hover:underline">
              {t('nav.marketplace')}
            </Link>
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
