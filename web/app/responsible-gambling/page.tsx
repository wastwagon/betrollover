import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { SITE_URL, SITE_NAME, getAlternates } from '@/lib/site-config';
import { getLocale, buildT } from '@/lib/i18n';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = buildT(locale);
  return {
    title: `${t('resp.headline')} | ${SITE_NAME}`,
    description: t('resp.commitment_desc'),
    alternates: { canonical: `${SITE_URL}/responsible-gambling`, languages: getAlternates('/responsible-gambling') },
  };
}

export default async function ResponsibleGamblingPage() {
  const locale = await getLocale();
  const t = buildT(locale);

  const tips = locale === 'fr'
    ? [
        'Fixez un budget personnel avant d\'acheter un coupon',
        'Ne tentez jamais de récupérer des pertes en achetant plus de coupons',
        'Les pronostics des tipsters sont informatifs — ils ne garantissent aucun résultat',
        "Ne prenez pas de décisions financières sous stress émotionnel ou influence",
        "La prédiction sportive doit être traitée comme un divertissement, pas une source de revenus",
      ]
    : [
        'Set a personal budget before purchasing any coupon',
        'Never attempt to recover losses by purchasing more coupons',
        'Tipster picks are informational — they do not guarantee any outcome',
        'Do not make financial decisions while under emotional stress or influence',
        'Sports prediction should be treated as entertainment, not a source of income',
      ];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <UnifiedHeader />

      <main>
        <article className="max-w-3xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold text-[var(--text)] mb-6">
            {t('resp.headline')}
          </h1>

          <div className="prose prose-slate max-w-none text-[var(--text)] space-y-6 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold mt-8 mb-3">{t('resp.commitment_title')}</h2>
              <p>{t('resp.commitment_desc')}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-3">{t('resp.age_title')}</h2>
              <p>{t('resp.age_desc')}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-3">
                {locale === 'fr' ? 'Utiliser Notre Plateforme de Façon Responsable' : 'Using Our Platform Responsibly'}
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                {tips.map((tip) => <li key={tip}>{tip}</li>)}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-3">
                {locale === 'fr' ? "Obtenir de l'Aide" : 'Get Help'}
              </h2>
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

        <div className="mt-16">
          <AppFooter />
        </div>
      </main>
    </div>
  );
}
