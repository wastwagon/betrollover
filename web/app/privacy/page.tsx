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
    title: t('privacy.title'),
    description: t('privacy.meta_desc', { site: SITE_NAME }),
    alternates: seoAlternates('/privacy', locale),
  };
}

export default async function PrivacyPage() {
  const locale = await getLocale();
  const t = buildT(locale);

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <UnifiedHeader />

      <main className="w-full min-w-0">
        <div className="section-ux-page w-full min-w-0">
          <PageHeader
            label={t('privacy.legal')}
            title={t('privacy.title')}
            tagline={`${t('privacy.effective')}: ${t('privacy.effective_date')}`}
          />
          <article className="section-ux-prose min-w-0">
          <div className="prose prose-slate max-w-none min-w-0 text-[var(--text)] space-y-8 leading-relaxed text-sm">

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
        </div>

        <div className="mt-16">
          <AppFooter />
        </div>
      </main>
    </div>
  );
}
