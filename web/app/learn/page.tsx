import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { PageHeader } from '@/components/PageHeader';
import { AppFooter } from '@/components/AppFooter';
import { DiscoverFamilyNav } from '@/components/DiscoverFamilyNav';
import { EducationRelatedLinks } from '@/components/EducationRelatedLinks';
import { GuidePanel, GuideStack, GuideStep } from '@/components/education/GuideChrome';
import { GrowthDistributionStrip } from '@/components/GrowthDistributionStrip';
import { buttonClassName } from '@/components/ui/button-styles';
import { SITE_NAME } from '@/lib/site-config';
import { getLocale, buildT } from '@/lib/i18n';

export default async function LearnPage() {
  const locale = await getLocale();
  const t = buildT(locale);
  const glossary = [
    { term: t('learn.term_escrow'), def: t('learn.def_escrow') },
    { term: t('learn.term_roi'), def: t('learn.def_roi') },
    { term: t('learn.term_winrate'), def: t('learn.def_winrate') },
    { term: t('learn.term_acca'), def: t('learn.def_acca') },
    { term: t('learn.term_settlement'), def: t('learn.def_settlement') },
    { term: t('learn.term_void'), def: t('learn.def_void') },
    { term: t('learn.term_pick'), def: t('learn.def_pick') },
    { term: t('learn.term_tipster'), def: t('learn.def_tipster') },
  ];
  const evaluate = [
    { title: t('learn.eval_track_title'), desc: t('learn.eval_track_desc') },
    { title: t('learn.eval_consistency_title'), desc: t('learn.eval_consistency_desc') },
    { title: t('learn.eval_transparency_title'), desc: t('learn.eval_transparency_desc') },
    { title: t('learn.eval_price_title'), desc: t('learn.eval_price_desc') },
  ];
  const market = [
    { title: t('learn.market_football_title'), desc: t('learn.market_football_desc') },
    { title: t('learn.market_compare_title'), desc: t('learn.market_compare_desc') },
    { title: t('learn.market_free_title'), desc: t('learn.market_free_desc') },
    { title: t('learn.market_escrow_title'), desc: t('learn.market_escrow_desc') },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <UnifiedHeader />
      <main className="w-full min-w-0">
        <div className="section-ux-page-narrow w-full min-w-0">
          <PageHeader
            label={t('learn.education')}
            title={t('learn.page_title')}
            tagline={t('learn.page_intro', { site: SITE_NAME })}
          />
          <DiscoverFamilyNav current="learn" />
          <EducationRelatedLinks current="learn" />

          <GuideStack>
            <GuidePanel>
              <h2 className="text-[17px] font-semibold tracking-tight text-[var(--text)]">
                {t('learn.section_platform')}
              </h2>
              <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-[var(--text-muted)] [&_a]:font-semibold [&_a]:text-[var(--primary)]">
                <p>{t('learn.platform_p1', { site: SITE_NAME })}</p>
                <p>{t('learn.platform_p2')}</p>
                <p>
                  {t('learn.platform_more_prefix')}{' '}
                  <Link href="/how-it-works">{t('learn.cta_how_it_works')}</Link>
                  {' '}{t('learn.platform_more_and')}{' '}
                  <Link href="/how-it-works#faq">{t('how_it_works.faq_title')}</Link>.
                </p>
              </div>
            </GuidePanel>

            <section id="glossary" className="scroll-mt-[calc(var(--br-chrome-below-header)+1rem)]">
              <h2 className="mb-3 px-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                {t('learn.section_glossary')}
              </h2>
              <dl className="ios-grouped-section overflow-hidden divide-y divide-[var(--separator)]">
                {glossary.map((item) => (
                  <div key={item.term} className="px-4 py-3.5 sm:px-5 sm:py-4 bg-[var(--card)]">
                    <dt className="text-[15px] font-semibold text-[var(--text)]">{item.term}</dt>
                    <dd className="mt-1.5 text-[14px] leading-relaxed text-[var(--text-muted)]">{item.def}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 px-1 text-[13px] leading-relaxed text-[var(--text-muted)] [&_a]:font-semibold [&_a]:text-[var(--primary)]">
                {t('learn.guide_links_lead')}{' '}
                <Link href="/guides/read-tipster-stats">{t('guides.stats_card_title')}</Link>
                {' · '}
                <Link href="/guides/how-accumulators-settle">{t('guides.acca_card_title')}</Link>
                {' · '}
                <Link href="/guides/free-and-paid-picks">{t('guides.free_card_title')}</Link>
                {' · '}
                <Link href="/guides/leaderboard-ranking">{t('guides.board_card_title')}</Link>.
              </p>
            </section>

            <div>
              <h2 className="mb-3 px-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                {t('learn.section_evaluate')}
              </h2>
              <p className="mb-3 px-1 text-[14px] leading-relaxed text-[var(--text-muted)]">
                {t('learn.evaluate_intro')}
              </p>
              <GuideStack>
                {evaluate.map((item, i) => (
                  <GuideStep key={item.title} index={String(i + 1)} title={item.title}>
                    <p>{item.desc}</p>
                  </GuideStep>
                ))}
              </GuideStack>
              <p className="mt-3 px-1 text-[13px] leading-relaxed text-[var(--text-muted)] [&_a]:font-semibold [&_a]:text-[var(--primary)]">
                {t('learn.evaluate_footer_before')}{' '}
                <Link href="/leaderboard">{t('nav.leaderboard')}</Link>
                {' '}{t('learn.evaluate_footer_mid')}{' '}
                <Link href="/marketplace">{t('nav.marketplace')}</Link>
                {' '}{t('learn.evaluate_footer_after')}
              </p>
            </div>

            <div>
              <h2 className="mb-3 px-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                {t('learn.section_marketplace')}
              </h2>
              <p className="mb-3 px-1 text-[14px] leading-relaxed text-[var(--text-muted)]">
                {t('learn.market_intro')}
              </p>
              <GuideStack>
                {market.map((item, i) => (
                  <GuideStep key={item.title} index={String(i + 1)} title={item.title}>
                    <p>{item.desc}</p>
                  </GuideStep>
                ))}
              </GuideStack>
              <p className="mt-3 px-1 text-[13px] leading-relaxed text-[var(--text-muted)] [&_a]:font-semibold [&_a]:text-[var(--primary)]">
                {t('learn.market_footer_new')}{' '}
                <Link href="/how-it-works">{t('learn.cta_how_it_works')}</Link>
                {' '}{t('learn.market_footer_and')}{' '}
                <Link href="/how-it-works#faq">{t('how_it_works.faq_title')}</Link>
                {t('learn.market_footer_then')}{' '}
                <Link href="/marketplace">{t('nav.marketplace')}</Link>
                {' '}{t('learn.market_footer_or')}{' '}
                <Link href="/discover">{t('nav.discover')}</Link>
                {t('learn.market_footer_end')}
              </p>
            </div>

            <div className="mt-6">
              <GrowthDistributionStrip compact />
            </div>

            <GuidePanel>
              <p className="font-display font-semibold text-[var(--text)] mb-3">{t('learn.cta_ready')}</p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <Link href="/marketplace" className={buttonClassName({ className: 'w-full sm:w-auto' })}>
                  {t('learn.cta_marketplace')}
                </Link>
                <Link href="/how-it-works" className={buttonClassName({ variant: 'secondary', className: 'w-full sm:w-auto' })}>
                  {t('learn.cta_how_it_works')}
                </Link>
                <Link href="/guides" className={buttonClassName({ variant: 'secondary', className: 'w-full sm:w-auto' })}>
                  {t('learn.open_howtos')}
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
