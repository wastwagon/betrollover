import { UnifiedHeader } from '@/components/UnifiedHeader';
import { PageHeader } from '@/components/PageHeader';
import { AppFooter } from '@/components/AppFooter';
import { FaqJsonLd } from '@/components/FaqJsonLd';
import Link from 'next/link';
import { getLocale, buildT } from '@/lib/i18n';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { fetchSellingThresholds } from '@/lib/selling-thresholds';
import { buttonClassName } from '@/components/ui/button-styles';
import {
  GuideCallout,
  GuideFaqList,
  GuidePanel,
  GuideStack,
  GuideStep,
} from '@/components/education/GuideChrome';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = buildT(locale);
  const th = await fetchSellingThresholds({ revalidate: 300 });
  const minRoi = String(th.minimumROI);
  const minWr = String(th.minimumWinRate);
  const description = t('how_it_works.meta_description', { minRoi, minWr });
  return {
    title: 'How It Works',
    description,
    alternates: seoAlternates('/how-it-works', locale),
    openGraph: {
      url: localizedUrl('/how-it-works', locale),
      title: 'How It Works',
      description,
    },
  };
}

function splitStep(text: string): { title: string; body: string | null } {
  const sep = ' — ';
  const i = text.indexOf(sep);
  if (i === -1) return { title: text, body: null };
  return { title: text.slice(0, i), body: text.slice(i + sep.length) };
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
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <FaqJsonLd faqs={faqs} />
      <UnifiedHeader />

      <main className="w-full min-w-0">
        <div className="section-ux-page-narrow w-full min-w-0">
          <PageHeader
            label={t('how_it_works.page_label')}
            title={t('how_it_works.page_h1')}
            tagline={t('how_it_works.page_lead')}
          />

          <GuideStack>
            <div>
              <h2 className="mb-3 px-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                {t('how_it_works.buyers_h2')}
              </h2>
              <GuideStack>
                {buyerSteps.map((item, i) => {
                  const step = splitStep(item);
                  return (
                    <GuideStep key={step.title} index={String(i + 1)} title={step.title}>
                      {step.body ? <p>{step.body}</p> : null}
                    </GuideStep>
                  );
                })}
              </GuideStack>
            </div>

            <div>
              <h2 className="mb-3 px-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                {t('how_it_works.tipsters_h2')}
              </h2>
              <GuideStack>
                {tipsterSteps.map((item, i) => {
                  const step = splitStep(item);
                  return (
                    <GuideStep key={step.title} index={String(i + 1)} title={step.title}>
                      {step.body ? <p>{step.body}</p> : null}
                    </GuideStep>
                  );
                })}
              </GuideStack>
            </div>

            <GuidePanel>
              <h2 className="text-[17px] font-semibold tracking-tight text-[var(--text)]">
                {t('how_it_works.settlement_h2')}
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--text-muted)]">
                {t('how_it_works.settlement_p')}
              </p>
              <p className="mt-3 text-[14px] leading-relaxed text-[var(--text-muted)] [&_a]:font-semibold [&_a]:text-[var(--primary)]">
                <Link href="/guides/how-accumulators-settle">{t('guides.acca_card_title')}</Link>
                {' · '}
                <Link href="/guides/free-and-paid-picks">{t('guides.free_card_title')}</Link>
              </p>
            </GuidePanel>

            <GuidePanel>
              <h2 className="text-[17px] font-semibold tracking-tight text-[var(--text)]">
                {t('how_it_works.verification_h2')}
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--text-muted)]">
                {t('how_it_works.verification_p', sellVars)}
              </p>
            </GuidePanel>

            <section
              id="refund-rule"
              className="scroll-mt-[calc(var(--br-chrome-below-header)+1rem)]"
            >
              <GuideCallout>
                <span className="block text-[15px] font-semibold text-[var(--text)] mb-2">
                  {t('how_it_works.refund_h2')}
                </span>
                <span className="block leading-relaxed">{t('how_it_works.refund_when')}</span>
                <span className="mt-2 block leading-relaxed">{t('how_it_works.refund_how_long')}</span>
                <span className="mt-2 block leading-relaxed">{t('how_it_works.refund_where')}</span>
                <span className="mt-3 block text-[12px] text-[var(--text-muted)] [&_a]:font-semibold [&_a]:text-[var(--primary)]">
                  <Link href="/guides/purchase-protection">{t('how_it_works.guides_link')}</Link>
                  {' · '}
                  <Link href="/support">{t('support.title')}</Link>
                  {' · '}
                  <a href="mailto:support@betrollover.com">support@betrollover.com</a>
                </span>
              </GuideCallout>
            </section>

            <div id="faq" className="scroll-mt-[calc(var(--br-chrome-below-header)+1rem)]">
              <GuideFaqList title={t('how_it_works.faq_title')} faqs={faqs} />
            </div>

            <GuidePanel>
              <p className="font-display font-semibold text-[var(--text)] mb-3 text-[15px]">
                {t('about.ready_cta')}
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                <Link href="/marketplace" className={buttonClassName({ className: 'w-full sm:w-auto' })}>
                  {t('learn.cta_marketplace')}
                </Link>
                <Link href="/register" className={buttonClassName({ variant: 'secondary', className: 'w-full sm:w-auto' })}>
                  {t('auth.register')}
                </Link>
                <Link
                  href="/guides/purchase-protection"
                  className={buttonClassName({ variant: 'secondary', className: 'w-full sm:w-auto' })}
                >
                  {t('how_it_works.guides_link')}
                </Link>
                <Link href="/learn" className={buttonClassName({ variant: 'secondary', className: 'w-full sm:w-auto' })}>
                  {t('how_it_works.learn_link')}
                </Link>
              </div>
            </GuidePanel>
          </GuideStack>
        </div>

        <div className="mt-16">
          <AppFooter />
        </div>
      </main>
    </div>
  );
}
