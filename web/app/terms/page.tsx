import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { SITE_URL, SITE_NAME, getAlternates } from '@/lib/site-config';
import { getLocale, buildT } from '@/lib/i18n';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = locale === 'fr' ? `Conditions d'Utilisation | ${SITE_NAME}` : `Terms of Service | ${SITE_NAME}`;
  const description = locale === 'fr'
    ? `Lisez les Conditions d'Utilisation de ${SITE_NAME} — les règles et l'accord utilisateur régissant l'utilisation de notre marketplace de tipsters éducative.`
    : `Read the ${SITE_NAME} Terms of Service — the rules, conditions, and user agreement governing use of our educational tipster marketplace.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/terms`, languages: getAlternates('/terms') },
  };
}

const EFFECTIVE_DATE = 'February 2025';

export default async function TermsPage() {
  const locale = await getLocale();
  const t = buildT(locale);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <UnifiedHeader />

      <main>
        <article className="section-ux-prose">
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[var(--primary)] mb-2 sm:mb-3">
            {t('privacy.legal')}
          </p>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-[var(--text)] mb-2 leading-tight">{t('terms.title')}</h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mb-8 sm:mb-10">
            {t('privacy.effective')}: {EFFECTIVE_DATE}
          </p>

          <div className="prose prose-slate max-w-none text-[var(--text)] space-y-7 sm:space-y-9 leading-relaxed text-sm sm:text-[15px]">

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
              className="rounded-2xl border border-emerald-500/15 dark:border-emerald-700/30 bg-gradient-to-br from-emerald-500/[0.07] via-[var(--card)] to-[var(--card)] dark:from-emerald-950/25 dark:via-[var(--card)] p-5 sm:p-6 md:p-7 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06] -mx-1 sm:mx-0"
              aria-labelledby="terms-fee-heading"
            >
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
                {t('terms.tipster_fee_badge')}
              </p>
              <h2 id="terms-fee-heading" className="text-base sm:text-lg font-semibold mb-3 text-[var(--text)]">
                {t('terms.tipster_fee_title')}
              </h2>
              <p className="text-sm sm:text-[15px] text-[var(--text-muted)] leading-relaxed m-0">
                {t('terms.tipster_fee_content')}
              </p>
              <div className="mt-5 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3">
                <span className="inline-flex items-center justify-center rounded-xl bg-white/80 dark:bg-slate-800/80 border border-emerald-500/20 px-3 py-2.5 sm:py-2 text-xs sm:text-sm font-semibold text-emerald-800 dark:text-emerald-200 min-h-[44px] sm:min-h-0">
                  {t('terms.fee_split_tipster')}
                </span>
                <span className="inline-flex items-center justify-center rounded-xl bg-slate-900/5 dark:bg-white/5 border border-[var(--border)] px-3 py-2.5 sm:py-2 text-xs sm:text-sm font-medium text-[var(--text-muted)] min-h-[44px] sm:min-h-0">
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

            <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-warm,#f8fafc)] dark:bg-slate-900/40 border border-[var(--border)] text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
              {t('terms.questions')}{' '}
              <a href="mailto:legal@betrollover.com" className="text-[var(--primary)] hover:underline">
                legal@betrollover.com
              </a>
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
