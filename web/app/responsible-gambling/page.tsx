import { UnifiedHeader } from '@/components/UnifiedHeader';
import { PageHeader } from '@/components/PageHeader';
import { AppFooter } from '@/components/AppFooter';
import { seoAlternates } from '@/lib/site-config';
import { getLocale, buildT } from '@/lib/i18n';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = buildT(locale);
  return {
    title: t('resp.headline'),
    description: t('resp.commitment_desc'),
    alternates: seoAlternates('/responsible-gambling', locale),
  };
}

export default async function ResponsibleGamblingPage() {
  const t = buildT(await getLocale());

  const tips = [
    t('resp.tip_1'),
    t('resp.tip_2'),
    t('resp.tip_3'),
    t('resp.tip_4'),
    t('resp.tip_5'),
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <UnifiedHeader />

      <main className="w-full min-w-0">
        <div className="section-ux-page w-full min-w-0">
          <PageHeader
            label={t('resp.page_label')}
            title={t('resp.headline')}
            tagline={t('resp.commitment_desc')}
          />
          <article className="section-ux-prose min-w-0">
          <div className="prose prose-slate max-w-none min-w-0 text-[var(--text)] space-y-6 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold mt-8 mb-3">{t('resp.commitment_title')}</h2>
              <p>{t('resp.commitment_desc')}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-3">{t('resp.age_title')}</h2>
              <p>{t('resp.age_desc')}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-3">{t('resp.using_title')}</h2>
              <ul className="list-disc pl-6 space-y-2">
                {tips.map((tip) => <li key={tip}>{tip}</li>)}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-3">{t('resp.help_title')}</h2>
              <p>{t('resp.help_desc')}</p>
              <ul className="list-none space-y-2 mt-3">
                <li>
                  <a href="https://www.gamcare.org.uk" target="_blank" rel="noopener noreferrer"
                    className="text-[var(--primary)] hover:underline">
                    GamCare – www.gamcare.org.uk
                  </a>
                </li>
                <li>
                  <a href="https://www.gamblersanonymous.org" target="_blank" rel="noopener noreferrer"
                    className="text-[var(--primary)] hover:underline">
                    Gamblers Anonymous – www.gamblersanonymous.org
                  </a>
                </li>
                <li>
                  <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer"
                    className="text-[var(--primary)] hover:underline">
                    BeGambleAware – www.begambleaware.org
                  </a>
                </li>
              </ul>
            </section>

            <div className="mt-10 p-4 bg-[var(--bg-warm)] rounded-lg border border-[var(--border)]">
              <p className="text-sm italic text-[var(--text-muted)]">
                {t('resp.disclaimer_desc')}
              </p>
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
