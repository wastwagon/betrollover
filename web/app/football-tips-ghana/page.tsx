import type { Metadata } from 'next';
import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { FaqJsonLd } from '@/components/FaqJsonLd';
import { buttonClassName } from '@/components/ui/button-styles';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { getLocale, buildT } from '@/lib/i18n';
import { metaKeywordsFromTranslation } from '@/lib/seo/meta-keywords';

const PATH = '/football-tips-ghana';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = buildT(locale);
  const title = t('ghana_hub.meta_title');
  const description = t('ghana_hub.meta_desc');
  return {
    title,
    description,
    keywords: metaKeywordsFromTranslation(t('ghana_hub.meta_keywords')),
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
    alternates: seoAlternates(PATH, locale),
    openGraph: {
      url: localizedUrl(PATH, locale),
      title,
      description,
      type: 'website',
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function FootballTipsGhanaPage() {
  const t = buildT(await getLocale());
  const faqs = [
    { question: t('ghana_hub.faq_q1'), answer: t('ghana_hub.faq_a1') },
    { question: t('ghana_hub.faq_q2'), answer: t('ghana_hub.faq_a2') },
    { question: t('ghana_hub.faq_q3'), answer: t('ghana_hub.faq_a3') },
    { question: t('ghana_hub.faq_q4'), answer: t('ghana_hub.faq_a4') },
    { question: t('ghana_hub.faq_q5'), answer: t('ghana_hub.faq_a5') },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <FaqJsonLd faqs={faqs} />
      <UnifiedHeader />
      <main className="section-ux-page-narrow w-full min-w-0">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)] mb-2">
            {t('ghana_hub.label')}
          </p>
          <h1 className="font-display text-[1.7rem] sm:text-4xl font-semibold tracking-tight text-[var(--text)] leading-tight">
            {t('ghana_hub.title')}
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[var(--text-muted)] leading-relaxed max-w-2xl">
            {t('ghana_hub.tagline')}
          </p>
        </header>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 mb-8">
          <Link href="/marketplace" className={buttonClassName({ className: 'min-h-[48px]' })}>
            {t('ghana_hub.cta_marketplace')}
          </Link>
          <Link href="/buy-football-tips" className={buttonClassName({ variant: 'secondary', className: 'min-h-[48px]' })}>
            {t('ghana_hub.cta_buy')}
          </Link>
          <Link href="/tipsters" className={buttonClassName({ variant: 'secondary', className: 'min-h-[48px]' })}>
            {t('ghana_hub.cta_tipsters')}
          </Link>
        </div>

        <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-7 text-[var(--text)]">
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">{t('ghana_hub.intro')}</p>

          <h2 className="text-lg font-semibold mt-6">{t('ghana_hub.platform_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{t('ghana_hub.platform_body')}</p>

          <h2 className="text-lg font-semibold mt-6">{t('ghana_hub.protection_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            {t('ghana_hub.protection_body')}{' '}
            <Link href="/guides/purchase-protection" className="font-semibold text-[var(--primary)] hover:underline">
              {t('ghana_hub.cta_protection')}
            </Link>
            {' · '}
            <Link href="/track-record" className="font-semibold text-[var(--primary)] hover:underline">
              {t('track_record.nav')}
            </Link>
          </p>

          <h2 className="text-lg font-semibold mt-6">{t('ghana_hub.verify_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            {t('ghana_hub.verify_body')}{' '}
            <Link href="/leaderboard" className="font-semibold text-[var(--primary)] hover:underline">
              {t('nav.leaderboard')}
            </Link>
          </p>

          <h2 className="text-lg font-semibold mt-6">{t('ghana_hub.bookies_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            {t('ghana_hub.bookies_body')}{' '}
            <Link href="/guides/free-and-paid-picks#booking-codes" className="font-semibold text-[var(--primary)] hover:underline">
              {t('footer.booking_codes')}
            </Link>
          </p>

          <h2 className="text-lg font-semibold mt-6">{t('ghana_hub.vs_telegram_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{t('ghana_hub.vs_telegram_body')}</p>

          <p className="mt-6 text-xs text-[var(--text-tertiary)] leading-relaxed">{t('buy.not_guaranteed')}</p>
        </article>

        <section className="mt-8" aria-label="FAQ">
          <dl className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
                <dt className="font-semibold text-[var(--text)]">{faq.question}</dt>
                <dd className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
      <AppFooter />
    </div>
  );
}
