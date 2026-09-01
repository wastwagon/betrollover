import { UnifiedHeader } from '@/components/UnifiedHeader';
import { PageHeader } from '@/components/PageHeader';
import { AppFooter } from '@/components/AppFooter';
import { SITE_NAME, seoAlternates } from '@/lib/site-config';
import { getLocale, buildT } from '@/lib/i18n';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = buildT(locale);
  return {
    title: t('terms.title'),
    description: t('terms.meta_desc', { site: SITE_NAME }),
    alternates: seoAlternates('/terms', locale),
  };
}

export default async function TermsPage() {
  const locale = await getLocale();
  const t = buildT(locale);

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <UnifiedHeader />

      <main className="w-full min-w-0">
        <div className="section-ux-page w-full min-w-0">
          <PageHeader
            label={t('privacy.legal')}
            title={t('terms.title')}
            tagline={`${t('privacy.effective')}: ${t('privacy.effective_date')}`}
          />
          <article className="section-ux-prose min-w-0">
          <div className="prose prose-slate max-w-none min-w-0 text-[var(--text)] space-y-7 sm:space-y-9 leading-relaxed text-sm sm:text-[15px]">

            <section>
              <h2 className="text-lg font-semibold mb-2">{t('terms.section1_title')}</h2>
              <p>{t('terms.section1_content')}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">{t('terms.section2_title')}</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('terms.section2_item1')}</li>
                <li>{t('terms.section2_item2')}</li>
                <li>{t('terms.section2_item3')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">{t('terms.section3_title')}</h2>
              <p>{t('terms.section3_content')}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">{t('terms.section4_title')}</h2>
              <p>{t('terms.section4_content')}</p>
            </section>

            <section
              className="rounded-[var(--radius)] border border-[var(--separator)] bg-[var(--card)] p-5 sm:p-6 md:p-7 -mx-1 sm:mx-0"
              aria-labelledby="terms-fee-heading"
            >
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[var(--primary)] mb-2">
                {t('terms.tipster_fee_badge')}
              </p>
              <h2 id="terms-fee-heading" className="text-base sm:text-lg font-semibold mb-3 text-[var(--text)]">
                {t('terms.tipster_fee_title')}
              </h2>
              <p className="text-sm sm:text-[15px] text-[var(--text-muted)] leading-relaxed m-0">
                {t('terms.tipster_fee_content')}
              </p>
              <div className="mt-5 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3">
                <span className="inline-flex items-center justify-center rounded-xl bg-[var(--success-light)] border border-[var(--success)]/25 px-3 py-2.5 sm:py-2 text-xs sm:text-sm font-semibold text-[var(--success)] min-h-[44px] sm:min-h-0">
                  {t('terms.fee_split_tipster')}
                </span>
                <span className="inline-flex items-center justify-center rounded-xl bg-[var(--fill-secondary)] border border-[var(--border)] px-3 py-2.5 sm:py-2 text-xs sm:text-sm font-medium text-[var(--text-muted)] min-h-[44px] sm:min-h-0">
                  {t('terms.fee_split_platform')}
                </span>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">{t('terms.section5_title')}</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('terms.section5_item1')}</li>
                <li>{t('terms.section5_item2')}</li>
                <li>{t('terms.section5_item3')}</li>
                <li>{t('terms.section5_item4')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">{t('terms.section6_title')}</h2>
              <p>{t('terms.section6_content')}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">{t('terms.section7_title')}</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('terms.section7_item1')}</li>
                <li>{t('terms.section7_item2')}</li>
                <li>{t('terms.section7_item3')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">{t('terms.section8_title')}</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('terms.section8_item1')}</li>
                <li>{t('terms.section8_item2')}</li>
                <li>{t('terms.section8_item3')}</li>
                <li>{t('terms.section8_item4')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">{t('terms.section9_title')}</h2>
              <p>{t('terms.section9_content')}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">{t('terms.section10_title')}</h2>
              <p>{t('terms.section10_content')}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">{t('terms.section11_title')}</h2>
              <p>{t('terms.section11_content')}</p>
            </section>

            <div className="p-4 sm:p-5 rounded-2xl bg-[var(--fill-secondary)] border border-[var(--border)] text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
              {t('terms.questions')}{' '}
              <a href="mailto:legal@betrollover.com" className="text-[var(--primary)] hover:underline">
                legal@betrollover.com
              </a>
            </div>

          </div>
        </article>
        </div>

        <div className="mt-16">
          <AppFooter />
        </div>
      </main>
    </div>
  );
}
