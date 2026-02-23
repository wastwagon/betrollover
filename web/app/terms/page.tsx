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
        <article className="max-w-3xl mx-auto px-6 py-12">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--primary)] mb-3">
            {t('privacy.legal')}
          </p>
          <h1 className="text-3xl font-bold text-[var(--text)] mb-2">{t('terms.title')}</h1>
          <p className="text-sm text-[var(--text-muted)] mb-10">
            {t('privacy.effective')}: {EFFECTIVE_DATE}
          </p>

          <div className="prose prose-slate max-w-none text-[var(--text)] space-y-8 leading-relaxed text-sm">

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

            <div className="p-4 rounded-xl bg-[var(--bg-warm,#f8fafc)] border border-[var(--border)] text-xs text-[var(--text-muted)]">
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
