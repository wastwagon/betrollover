import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { SITE_NAME, SITE_URL, getAlternates } from '@/lib/site-config';
import { getLocale, buildT } from '@/lib/i18n';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = buildT(locale);
  return {
    title: `${t('contact.headline')} | ${SITE_NAME}`,
    description: t('contact.intro'),
    alternates: { canonical: `${SITE_URL}/contact`, languages: getAlternates('/contact') },
  };
}

export default async function ContactPage() {
  const locale = await getLocale();
  const t = buildT(locale);

  const CONTACTS = [
    {
      icon: '📧',
      label: t('contact.support_title'),
      value: 'support@betrollover.com',
      href: 'mailto:support@betrollover.com',
      desc: t('contact.support_desc'),
    },
    {
      icon: '🤝',
      label: t('contact.partnerships_title'),
      value: 'partners@betrollover.com',
      href: 'mailto:partners@betrollover.com',
      desc: t('contact.partnerships_desc'),
    },
    {
      icon: '🚨',
      label: 'Report an Issue',
      value: 'abuse@betrollover.com',
      href: 'mailto:abuse@betrollover.com',
      desc: locale === 'fr' ? 'Pronostics trompeurs, fraude ou abus de plateforme' : 'Misleading picks, fraud, or platform abuse',
    },
    {
      icon: '⚖️',
      label: locale === 'fr' ? 'Juridique' : 'Legal',
      value: 'legal@betrollover.com',
      href: 'mailto:legal@betrollover.com',
      desc: locale === 'fr' ? 'Confidentialité, DMCA et conformité' : 'Privacy, DMCA, and compliance inquiries',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <UnifiedHeader />

      <main>
        <article className="max-w-3xl mx-auto px-6 py-12">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--primary)] mb-3">
            {t('contact.badge')}
          </p>
          <h1 className="text-3xl font-bold text-[var(--text)] mb-4">{t('contact.headline')}</h1>
          <p className="text-[var(--text-muted)] text-lg leading-relaxed mb-10">
            {t('contact.intro')}
          </p>

          <div className="prose prose-slate max-w-none text-[var(--text)] space-y-8 leading-relaxed">

            <div className="grid sm:grid-cols-2 gap-4">
              {CONTACTS.map(({ icon, label, value, href, desc }) => (
                <a
                  key={label}
                  href={href}
                  className="group flex flex-col gap-1 p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)] transition-colors"
                >
                  <span className="text-2xl mb-1">{icon}</span>
                  <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                    {label}
                  </span>
                  <span className="font-semibold text-[var(--primary)] group-hover:underline text-sm">
                    {value}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">{desc}</span>
                </a>
              ))}
            </div>

            <section>
              <h2 className="text-xl font-semibold mb-3">
                {locale === 'fr' ? 'Délais de Réponse' : 'Response Times'}
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                {locale === 'fr' ? (
                  <>
                    <li>Demandes de support — généralement sous 24 heures (Lun–Ven)</li>
                    <li>Litiges de portefeuille et de paiement — sous 48 heures</li>
                    <li>Demandes de partenariat — sous 3 à 5 jours ouvrables</li>
                  </>
                ) : (
                  <>
                    <li>Support requests — typically within 24 hours (Mon–Fri)</li>
                    <li>Wallet &amp; payment disputes — within 48 hours</li>
                    <li>Partnership inquiries — within 3–5 business days</li>
                  </>
                )}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">
                {locale === 'fr' ? 'Avant de Nous Écrire' : 'Before You Write'}
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                {locale === 'fr'
                  ? "De nombreuses questions courantes sont abordées dans nos guides. Consultez d'abord les "
                  : 'Many common questions are answered in our guides. Check the '}
                <Link href="/resources" className="text-[var(--primary)] hover:underline">
                  {t('nav.guides')}
                </Link>{' '}
                {locale === 'fr' ? 'ou la section ' : 'or '}
                <Link href="/discover" className="text-[var(--primary)] hover:underline">
                  {t('nav.discover')}
                </Link>{' '}
                {locale === 'fr'
                  ? "— vous y trouverez peut-être une réponse plus rapide."
                  : 'section first — you may find a faster answer there.'}
              </p>
            </section>

            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 text-sm text-amber-800 dark:text-amber-300">
              <strong>{locale === 'fr' ? 'Remarque' : 'Note'}:</strong>{' '}
              {locale === 'fr'
                ? `${SITE_NAME} ne facilite pas les paris. Nous ne pouvons pas aider avec des questions concernant des bookmakers ou comptes de paris tiers.`
                : `${SITE_NAME} does not facilitate betting or wagering. We cannot assist with queries about third-party bookmakers or betting accounts.`}
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
