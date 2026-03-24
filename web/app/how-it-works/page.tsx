import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { FaqJsonLd } from '@/components/FaqJsonLd';
import Link from 'next/link';
import { getLocale, buildT } from '@/lib/i18n';
import { SITE_URL, SITE_NAME, getAlternates } from '@/lib/site-config';
import { fetchSellingThresholds } from '@/lib/selling-thresholds';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const th = await fetchSellingThresholds({ revalidate: 300 });
  const minRoi = String(th.minimumROI);
  const minWr = String(th.minimumWinRate);
  const description = `How BetRollover works: escrow-protected picks, transparent settlement. Same account to buy or sell — ${minRoi}% ROI and ${minWr}% win rate unlock paid marketplace coupons (admin-set). Refunded if picks lose.`;
  return {
    title: `How It Works | ${SITE_NAME}`,
    description,
    alternates: {
      canonical: `${SITE_URL}/how-it-works`,
      languages: getAlternates('/how-it-works'),
    },
    openGraph: {
      url: `${SITE_URL}/how-it-works`,
      title: `How It Works | ${SITE_NAME}`,
      description,
    },
  };
}

function ListItem({ text }: { text: string }) {
  const sep = ' — ';
  const i = text.indexOf(sep);
  if (i === -1) return <>{text}</>;
  return (
    <>
      <strong>{text.slice(0, i)}</strong>
      {sep}
      {text.slice(i + sep.length)}
    </>
  );
}

export default async function HowItWorksPage() {
  const locale = await getLocale();
  const t = buildT(locale);
  const th = await fetchSellingThresholds({ revalidate: 300 });
  const sellVars = { minRoi: String(th.minimumROI), minWr: String(th.minimumWinRate) };

  const faqs = [
    { question: t('how_it_works.faq_escrow_q'), answer: t('how_it_works.faq_escrow_a') },
    { question: t('how_it_works.faq_lose_q'), answer: t('how_it_works.faq_lose_a') },
    { question: t('how_it_works.faq_sell_q'), answer: t('how_it_works.faq_sell_a', sellVars) },
    { question: t('how_it_works.faq_settle_q'), answer: t('how_it_works.faq_settle_a') },
    { question: t('how_it_works.faq_earn_q'), answer: t('how_it_works.faq_earn_a') },
  ];

  const buyerSteps = [
    t('how_it_works.buyers_li1'),
    t('how_it_works.buyers_li2'),
    t('how_it_works.buyers_li3'),
    t('how_it_works.buyers_li4'),
  ];
  const tipsterSteps = [
    t('how_it_works.tipsters_li1'),
    t('how_it_works.tipsters_li2', sellVars),
    t('how_it_works.tipsters_li3'),
    t('how_it_works.tipsters_li4'),
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <FaqJsonLd faqs={faqs} />
      <UnifiedHeader />

      <main>
        <article className="section-ux-prose">
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[var(--primary)] mb-2 sm:mb-3">
            Transparency
          </p>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-[var(--text)] mb-3 sm:mb-4 leading-tight">
            How BetRollover Works
          </h1>
          <p className="text-[var(--text-muted)] text-sm sm:text-base md:text-lg leading-relaxed mb-8 sm:mb-10">
            {t('how_it_works.page_lead')}
          </p>

          <div className="prose prose-slate max-w-none text-[var(--text)] space-y-8 sm:space-y-10 leading-relaxed text-sm sm:text-[15px]">

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/40 p-4 sm:p-6 md:p-7">
              <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4 capitalize text-[var(--text)]">{t('how_it_works.buyers_h2')}</h2>
              <ol className="list-decimal pl-4 sm:pl-6 space-y-3 sm:space-y-4 marker:text-[var(--primary)] marker:font-semibold">
                {buyerSteps.map((item) => (
                  <li key={item.slice(0, 48)}>
                    <ListItem text={item} />
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-2xl border border-violet-500/15 dark:border-violet-800/25 bg-gradient-to-br from-violet-500/[0.05] to-[var(--card)]/60 p-4 sm:p-6 md:p-7">
              <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4 capitalize text-[var(--text)]">{t('how_it_works.tipsters_h2')}</h2>
              <ol className="list-decimal pl-4 sm:pl-6 space-y-3 sm:space-y-4 marker:text-violet-600 dark:marker:text-violet-400 marker:font-semibold">
                {tipsterSteps.map((item) => (
                  <li key={item.slice(0, 48)}>
                    <ListItem text={item} />
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/30 p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">{t('how_it_works.settlement_h2')}</h2>
              <p className="m-0 text-[var(--text-muted)] leading-relaxed">{t('how_it_works.settlement_p')}</p>
            </section>

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/30 p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">{t('how_it_works.verification_h2')}</h2>
              <p className="m-0 text-[var(--text-muted)] leading-relaxed">{t('how_it_works.verification_p', sellVars)}</p>
            </section>

            <section id="faq" className="scroll-mt-24">
              <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-4 sm:mb-5">{t('how_it_works.faq_title')}</h2>
              <ul className="space-y-3 sm:space-y-4 list-none pl-0">
                {faqs.map((faq, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-[var(--border)] bg-[var(--card)]/50 p-4 sm:p-5 shadow-sm"
                  >
                    <h3 className="text-sm sm:text-[15px] font-semibold text-[var(--text)] mb-2 leading-snug">{faq.question}</h3>
                    <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed m-0">{faq.answer}</p>
                  </li>
                ))}
              </ul>
            </section>

            <div className="mt-8 sm:mt-10 p-4 sm:p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 ring-1 ring-emerald-500/10">
              <p className="font-semibold text-[var(--text)] mb-3 sm:mb-4 text-sm sm:text-base">Ready to get started?</p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                <Link
                  href="/marketplace"
                  className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors w-full sm:w-auto"
                >
                  Browse Marketplace
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl border-2 border-[var(--border)] text-sm font-semibold text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors w-full sm:w-auto bg-[var(--card)]/50"
                >
                  Create Account
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
