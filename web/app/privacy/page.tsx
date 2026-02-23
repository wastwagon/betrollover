import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { SITE_URL, SITE_NAME, getAlternates } from '@/lib/site-config';
import { getLocale, buildT } from '@/lib/i18n';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = locale === 'fr' ? `Politique de Confidentialité | ${SITE_NAME}` : `Privacy Policy | ${SITE_NAME}`;
  const description = locale === 'fr'
    ? `Politique de Confidentialité de ${SITE_NAME} — comment nous collectons, utilisons et protégeons vos données personnelles sur notre marketplace éducative de tipsters.`
    : `${SITE_NAME} Privacy Policy — how we collect, use, and protect your personal data on our educational tipster marketplace.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/privacy`, languages: getAlternates('/privacy') },
  };
}

const EFFECTIVE_DATE = 'February 2025';

export default async function PrivacyPage() {
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
          <h1 className="text-3xl font-bold text-[var(--text)] mb-2">{t('privacy.title')}</h1>
          <p className="text-sm text-[var(--text-muted)] mb-10">
            {t('privacy.effective')}: {EFFECTIVE_DATE}
          </p>

          <div className="prose prose-slate max-w-none text-[var(--text)] space-y-8 leading-relaxed text-sm">

            <section>
              <h2 className="text-lg font-semibold mb-2">{t('privacy.section1_title')}</h2>
              <p>{t('privacy.section1_content')}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">{t('privacy.section2_title')}</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('privacy.section2_item1')}</li>
                <li>{t('privacy.section2_item2')}</li>
                <li>{t('privacy.section2_item3')}</li>
                <li>{t('privacy.section2_item4')}</li>
                <li>{t('privacy.section2_item5')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">{t('privacy.section3_title')}</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('privacy.section3_item1')}</li>
                <li>{t('privacy.section3_item2')}</li>
                <li>{t('privacy.section3_item3')}</li>
                <li>{t('privacy.section3_item4')}</li>
                <li>{t('privacy.section3_item5')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">{t('privacy.section4_title')}</h2>
              <p>{t('privacy.section4_intro')}</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>{t('privacy.section4_item1')}</li>
                <li>{t('privacy.section4_item2')}</li>
                <li>{t('privacy.section4_item3')}</li>
              </ul>
              <p className="mt-2">{t('privacy.section4_public')}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">{t('privacy.section5_title')}</h2>
              <p>{t('privacy.section5_content')}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">{t('privacy.section6_title')}</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('privacy.section6_item1')}</li>
                <li>{t('privacy.section6_item2')}</li>
                <li>{t('privacy.section6_item3')}</li>
                <li>{t('privacy.section6_item4')}</li>
              </ul>
              <p className="mt-2">
                {t('privacy.section6_contact')}{' '}
                <a href="mailto:legal@betrollover.com" className="text-[var(--primary)] hover:underline">
                  legal@betrollover.com
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">{t('privacy.section7_title')}</h2>
              <p>{t('privacy.section7_content')}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">{t('privacy.section8_title')}</h2>
              <p>{t('privacy.section8_content')}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">{t('privacy.section9_title')}</h2>
              <p>
                {t('privacy.section9_content')}{' '}
                <a href="mailto:legal@betrollover.com" className="text-[var(--primary)] hover:underline">
                  legal@betrollover.com
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">{t('privacy.section10_title')}</h2>
              <p>{t('privacy.section10_content')}</p>
            </section>

            <div className="p-4 rounded-xl bg-[var(--bg-warm,#f8fafc)] border border-[var(--border)] text-xs text-[var(--text-muted)]">
              {t('privacy.questions')}{' '}
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
