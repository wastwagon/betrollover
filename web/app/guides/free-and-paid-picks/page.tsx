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
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-7 text-[var(--text)]">
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">{t('guides.free_intro')}</p>

          <h2 className="text-lg font-semibold mt-6">{t('guides.free_free_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{t('guides.free_free_body')}</p>

          <h2 className="text-lg font-semibold mt-6">{t('guides.free_paid_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            {t('guides.free_paid_body')}{' '}
            <Link href="/guides/purchase-protection" className="text-[var(--primary)] hover:underline">
              {t('guides.acca_refund_link')}
            </Link>
            .
          </p>

          <h2 className="text-lg font-semibold mt-6">{t('guides.free_record_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            {t('guides.free_record_body')}{' '}
            <Link href="/guides/read-tipster-stats" className="text-[var(--primary)] hover:underline">
              {t('guides.stats_card_title')}
            </Link>
            .
          </p>

          <h2 className="text-lg font-semibold mt-6">{t('guides.free_price_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{t('guides.free_price_body', vars)}</p>

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
