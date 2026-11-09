import { UnifiedHeader } from '@/components/UnifiedHeader';
import { PageHeader } from '@/components/PageHeader';
import { AppFooter } from '@/components/AppFooter';
import Link from 'next/link';
import { getLocale, buildT } from '@/lib/i18n';
import { seoAlternates } from '@/lib/site-config';
import { isFootballOnlyDiscovery } from '@/lib/football-only-discovery';
import { fetchSellingThresholds } from '@/lib/selling-thresholds';
import { buttonClassName } from '@/components/ui/button-styles';
import type { Metadata } from 'next';

const footballOnly = isFootballOnlyDiscovery();

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: footballOnly
      ? 'About BetRollover | Football Predictions Marketplace'
      : 'About the Tipster Marketplace',
    description: footballOnly
      ? 'Who runs BetRollover, company details, how tipsters are checked, what verified and AI tipsters mean, and that users do not place bets here. Ghana-based. 18+.'
      : 'Learn about BetRollover — Ghana-based tipster marketplace. Purchase-protected picks, tipster checks, AI tipster labels. Not a bookmaker. 18+.',
    alternates: seoAlternates('/about', locale),
  };
}

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
              <h2 className="text-xl font-semibold mb-3">{t('about.who_h')}</h2>
              <p>{t('about.who_body')}</p>
              <p className="mt-3 text-sm">
                Email:{' '}
                <a href="mailto:support@betrollover.com" className="font-semibold text-[var(--primary)] hover:underline">
                  {t('about.contact_email')}
                </a>
              </p>
            </section>

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
              <h2 className="text-xl font-semibold mb-3">{t('about.verified_h')}</h2>
              <p>{t('about.verified_body')}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t('about.ai_h')}</h2>
              <p>{t('about.ai_body')}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t('about.not_bookie_h')}</h2>
              <p>{t('about.not_bookie_body')}</p>
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
                  className={buttonClassName({ className: 'w-full sm:w-auto' })}
                >
                  {t('home.view_marketplace')}
                </Link>
                <Link
                  href="/register"
                  className={buttonClassName({ variant: 'secondary', className: 'w-full sm:w-auto' })}
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
