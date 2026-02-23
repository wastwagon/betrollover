import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import Link from 'next/link';
import { getLocale, buildT } from '@/lib/i18n';
import { SITE_URL, SITE_NAME, getAlternates } from '@/lib/site-config';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: `About ${SITE_NAME} | Africa's Multi-Sport Tipster Marketplace`,
  description:
    `Learn about ${SITE_NAME} — Africa's escrow-protected multi-sport tipster marketplace. Verified tipsters, transparent performance stats, and refund-backed coupon purchases across football, basketball, tennis, MMA and more.`,
  alternates: {
    canonical: `${SITE_URL}/about`,
    languages: getAlternates('/about'),
  },
};

export default async function AboutPage() {
  const locale = await getLocale();
  const t = buildT(locale);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <UnifiedHeader />

      <main>
        <article className="max-w-3xl mx-auto px-6 py-12">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--primary)] mb-3">
            {t('nav.about')}
          </p>
          <h1 className="text-3xl font-bold text-[var(--text)] mb-4">
            {t('about.headline')}
          </h1>
          <p className="text-[var(--text-muted)] text-lg leading-relaxed mb-10">
            {t('about.intro')}
          </p>

          <div className="prose prose-slate max-w-none text-[var(--text)] space-y-10 leading-relaxed">

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
              <p>{t('about.tipster_status_desc')}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t('about.values_title')}</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>{t('about.value_transparency')}</strong> — {t('about.value_transparency_desc')}</li>
                <li><strong>{t('about.value_fairness')}</strong> — {t('about.value_fairness_desc')}</li>
                <li><strong>{t('about.value_education')}</strong> — {t('about.value_education_desc')}</li>
                <li><strong>{t('about.value_multisport')}</strong> — {t('about.value_multisport_desc')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t('about.africa_title')}</h2>
              <p>{t('about.africa_desc')}</p>
            </section>

            <div className="mt-10 p-5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40">
              <p className="font-semibold text-[var(--text)] mb-2">{t('about.ready_cta')}</p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/marketplace"
                  className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors"
                >
                  {t('home.view_marketplace')}
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-semibold text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                >
                  {t('auth.register')}
                </Link>
              </div>
            </div>

          </div>
        </article>

        <div className="mt-16">
          <AppFooter />
        </div>
      </main>
    </div>
  );
}
