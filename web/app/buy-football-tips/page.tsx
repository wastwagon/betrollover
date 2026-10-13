import type { Metadata } from 'next';
import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { FaqJsonLd } from '@/components/FaqJsonLd';
import { buttonClassName } from '@/components/ui/button-styles';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { getLocale, buildT } from '@/lib/i18n';
import { isSubscriptionsEnabled } from '@/lib/subscriptions-enabled';

const PATH = '/buy-football-tips';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = buildT(locale);
  const title = t('buy.meta_title');
  const description = t('buy.meta_desc');
  return {
    title,
    description,
    keywords: [
      'VIP football tips',
      'football tipster subscription',
      'paid football predictions',
      'buy football tips',
      'two fold football tips',
      'football accumulator tips',
      'football tips refund',
    ],
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

export default async function BuyFootballTipsPage() {
  const t = buildT(await getLocale());
  const vipOpen = isSubscriptionsEnabled();
  const faqs = [
    { question: t('buy.faq_q1'), answer: t('buy.faq_a1') },
    { question: t('buy.faq_q2'), answer: t('buy.faq_a2') },
    { question: t('buy.faq_q3'), answer: t('buy.faq_a3') },
    { question: t('buy.faq_q4'), answer: t('buy.faq_a4') },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <FaqJsonLd faqs={faqs} />
      <UnifiedHeader />
      <main className="section-ux-page-narrow w-full min-w-0">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)] mb-2">
            {t('buy.label')}
          </p>
          <h1 className="font-display text-[1.7rem] sm:text-4xl font-semibold tracking-tight text-[var(--text)] leading-tight">
            {t('buy.title')}
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[var(--text-muted)] leading-relaxed max-w-2xl">
            {t('buy.tagline')}
          </p>
        </header>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 mb-8">
          <Link href="/marketplace" className={buttonClassName({ className: 'min-h-[48px]' })}>
            {t('buy.cta_picks')}
          </Link>
          {vipOpen ? (
            <Link href="/subscriptions/marketplace" className={buttonClassName({ variant: 'secondary', className: 'min-h-[48px]' })}>
              {t('buy.cta_vip')}
            </Link>
          ) : null}
          <Link href="/rollover" className={buttonClassName({ variant: 'secondary', className: 'min-h-[48px]' })}>
            {t('buy.cta_rollover')}
          </Link>
          <Link href="/tipsters" className={buttonClassName({ variant: 'ghost', className: 'min-h-[48px]' })}>
            {t('buy.cta_tipsters')}
          </Link>
        </div>

        <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-7 text-[var(--text)]">
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">{t('buy.intro')}</p>

          <h2 className="text-lg font-semibold mt-6">{t('buy.picks_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            {t('buy.picks_body')}{' '}
            <Link href="/guides/purchase-protection" className="font-semibold text-[var(--primary)] hover:underline">
              {t('guides.escrow_short')}
            </Link>
          </p>

          <h2 className="text-lg font-semibold mt-6">{t('buy.vip_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{t('buy.vip_body')}</p>

          <h2 className="text-lg font-semibold mt-6">{t('buy.acca_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            {t('buy.acca_body')}{' '}
            <Link href="/acca-generator" className="font-semibold text-[var(--primary)] hover:underline">
              {t('nav.acca_generator')}
            </Link>
          </p>

          <h2 className="text-lg font-semibold mt-6">{t('buy.codes_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{t('buy.codes_body')}</p>

          <h2 className="text-lg font-semibold mt-6">{t('buy.compare_h')}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            {t('buy.compare_body')}{' '}
            <Link href="/leaderboard" className="font-semibold text-[var(--primary)] hover:underline">
              {t('nav.leaderboard')}
            </Link>
          </p>

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
