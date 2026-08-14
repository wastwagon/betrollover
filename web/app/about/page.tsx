import { UnifiedHeader } from '@/components/UnifiedHeader';
import { PageHeader } from '@/components/PageHeader';
import { AppFooter } from '@/components/AppFooter';
import Link from 'next/link';
import { getLocale, buildT } from '@/lib/i18n';
import { SITE_URL, SITE_NAME, getAlternates } from '@/lib/site-config';
import { isFootballOnlyDiscovery } from '@/lib/football-only-discovery';
import { fetchSellingThresholds } from '@/lib/selling-thresholds';
import type { Metadata } from 'next';

const footballOnly = isFootballOnlyDiscovery();

export const metadata: Metadata = {
  title: footballOnly
    ? `About ${SITE_NAME} | Football Predictions & Escrow-Protected Picks`
    : `About ${SITE_NAME} | Ghana-based, Global Tipster Marketplace`,
  description: footballOnly
    ? `About ${SITE_NAME}: Ghana-based football predictions marketplace for Africa and a global match audience. Escrow-protected picks, verified tipsters, refund if tips lose.`
    : `Learn about ${SITE_NAME} — Ghana-based, global audience. All major global sports: football, basketball, tennis, MMA, rugby and more. Escrow-protected picks, verified tipsters. Refund if tips lose. Worldwide coverage.`,
  alternates: {
    canonical: `${SITE_URL}/about`,
    languages: getAlternates('/about'),
  },
};

export default async function AboutPage() {
  const locale = await getLocale();
  const t = buildT(locale);
  const th = await fetchSellingThresholds({ revalidate: 300 });
  const sellVars = { minRoi: String(th.minimumROI), minWr: String(th.minimumWinRate) };

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <UnifiedHeader />

      <main className="w-full min-w-0">
        <div className="section-ux-page w-full min-w-0">
          <PageHeader label={t('nav.about')} title={t('about.headline')} tagline={t('about.intro')} />
          <article className="section-ux-prose min-w-0">
          <div className="prose prose-slate max-w-none text-[var(--text)] space-y-10 leading-relaxed min-w-0">

            <section>
              <h2 className="text-xl font-semibold mb-3">{t('about.what_we_do')}</h2>
              <p>{t('about.what_we_do_desc')}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t('about.escrow_title')}</h2>
              <p>{t('about.escrow_desc')}</p>
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                {t('about.escrow_disclaimer')}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t('about.tipster_status_title')}</h2>
              <p>{t('about.tipster_status_desc', sellVars)}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t('about.values_title')}</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>{t('about.value_transparency')}</strong> — {t('about.value_transparency_desc')}</li>
                <li><strong>{t('about.value_fairness')}</strong> — {t('about.value_fairness_desc')}</li>
                <li><strong>{t('about.value_education')}</strong> — {t('about.value_education_desc')}</li>
                {!isFootballOnlyDiscovery() ? (
                  <li><strong>{t('about.value_multisport')}</strong> — {t('about.value_multisport_desc')}</li>
                ) : (
                  <li><strong>{t('about.value_football')}</strong> — {t('about.value_football_desc')}</li>
                )}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t('about.africa_title')}</h2>
              <p>{t('about.africa_desc')}</p>
            </section>

            <div className="mt-10 p-5 rounded-[var(--radius)] border border-[var(--separator)] bg-[var(--card)]">
              <p className="font-display font-semibold text-[var(--text)] mb-3">{t('about.ready_cta')}</p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <Link
                  href="/marketplace"
                  className="inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-200 touch-manipulation bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm px-4 py-2.5 text-sm rounded-[var(--radius)] min-h-[44px] w-full sm:w-auto"
                >
                  {t('home.view_marketplace')}
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-200 touch-manipulation bg-[var(--card)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)] px-4 py-2.5 text-sm rounded-[var(--radius)] min-h-[44px] w-full sm:w-auto"
                >
                  {t('auth.register')}
                </Link>
              </div>
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
