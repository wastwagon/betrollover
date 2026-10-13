import { Suspense } from 'react';
import Link from 'next/link';
import {
  ArtworkSellerAccount,
  ArtworkSellerRoi,
  ArtworkSellerPayout,
  ArtworkNewsGuides,
  ArtworkExplore,
} from '@/components/home/HomeStepArtwork';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { AdSlot } from '@/components/AdSlot';
import { HomeHero } from '@/components/HomeHero';
import { HomeHeroBanner } from '@/components/HomeHeroBanner';
import { HomeJoinCtaCard } from '@/components/HomeJoinCtaCard';
import { HomePopularTipsters } from '@/components/HomePopularTipsters';
import { HomeFollowingShelf } from '@/components/HomeFollowingShelf';
import { HomePullToRefresh } from '@/components/HomePullToRefresh';
import { HomeMarketingCollapse } from '@/components/HomeMarketingCollapse';
import { FeaturedPicks } from '@/components/FeaturedPicks';
import { HomeFreeTipOfTheDay } from '@/components/HomeFreeTipOfTheDay';
import { HomeQuickMarketplaceSections } from '@/components/HomeQuickMarketplaceSections';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { fetchSellingThresholds } from '@/lib/selling-thresholds';
import { fetchHomePublicData } from '@/lib/home-public-data';
import { getLocale, buildT } from '@/lib/i18n';
import { buttonClassName } from '@/components/ui/button-styles';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = buildT(locale);
  const title = t('seo.home_title');
  const description = t('seo.home_desc');
  return {
    title: { absolute: title },
    description,
    alternates: seoAlternates('/', locale),
    openGraph: {
      url: localizedUrl('/', locale),
      title,
      description,
    },
  };
}

function HomeStreamFallback() {
  return (
    <div className="section-ux-cap-4xl w-full min-w-0 space-y-4 px-4 py-8 sm:px-6 lg:px-8" aria-hidden>
      <div className="h-8 w-40 animate-pulse rounded-lg bg-[var(--fill-secondary)]" />
      <div className="h-36 animate-pulse rounded-2xl bg-[var(--fill-secondary)]" />
      <div className="h-24 animate-pulse rounded-2xl bg-[var(--fill-secondary)]" />
    </div>
  );
}

async function HomeBelowFold() {
  const locale = await getLocale();
  const t = buildT(locale);
  const [th, homeData] = await Promise.all([
    fetchSellingThresholds({ revalidate: 300 }),
    fetchHomePublicData({ revalidate: 30 }),
  ]);
  const sellVars = { minRoi: String(th.minimumROI), minWr: String(th.minimumWinRate) };

  return (
    <>
        <HomeHero
          initialStats={homeData.stats}
          initialTodayMatches={homeData.todayMatches}
          marketplaceItems={homeData.marketplaceItems}
        />
        <div className="section-ux-rail-4xl w-full min-w-0">
          <AdSlot zoneSlug="home-below-hero" fullWidth className="w-full" />
        </div>
        {/* Tipsters immediately after the banner — Tipstrr-style discovery */}
        <HomePopularTipsters initialLeaderboard={homeData.topTipsters} />
        <HomeFollowingShelf />
        <FeaturedPicks initialFeatured={homeData.featuredPicks} />
        <section id="free-tip-of-the-day" className="w-full min-w-0">
          <HomeFreeTipOfTheDay initialFreeTips={homeData.freeTips} />
        </section>
        <div className="section-ux-rail-4xl w-full min-w-0">
          <AdSlot zoneSlug="between-sections" fullWidth className="w-full" />
        </div>
        <HomeQuickMarketplaceSections initialMarketItems={homeData.marketplaceItems} initialLeaderboard={homeData.topTipsters} />

        <section className="border-t border-[var(--border)] w-full min-w-0">
          <div className="section-ux-cap-4xl w-full min-w-0 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)] mb-4">
              {t('home.how_it_works')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 min-w-0">
              {[
                { n: '01', title: t('home.step1_title'), desc: t('home.step1_desc') },
                { n: '02', title: t('home.step2_title'), desc: t('home.step2_desc') },
                { n: '03', title: t('home.step3_title'), desc: t('home.step3_desc') },
              ].map((step) => (
                <div key={step.n} className="min-w-0">
                  <p className="text-[11px] font-bold text-[var(--text-tertiary)] tracking-widest mb-1">{step.n}</p>
                  <h3 className="font-display text-sm font-semibold text-[var(--text)] mb-1">{step.title}</h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-3">{step.desc}</p>
                </div>
              ))}
            </div>
            <nav className="mt-5 flex flex-wrap gap-x-4 gap-y-2" aria-label={t('nav.short_guides')}>
              <Link href="/guides/purchase-protection" className="text-sm font-semibold text-[var(--primary)] hover:underline">
                {t('guides.escrow_short')}
              </Link>
              <Link href="/guides/evaluate-tipsters" className="text-sm font-semibold text-[var(--primary)] hover:underline">
                {t('guides.eval_short')}
              </Link>
              <Link href="/guides/read-tipster-stats" className="text-sm font-semibold text-[var(--primary)] hover:underline">
                {t('guides.stats_short')}
              </Link>
              <Link href="/guides/accumulator-settlement" className="text-sm font-semibold text-[var(--primary)] hover:underline">
                {t('guides.acca_short')}
              </Link>
              <Link href="/guides/free-and-paid-picks" className="text-sm font-semibold text-[var(--primary)] hover:underline">
                {t('guides.free_short')}
              </Link>
              <Link href="/guides/leaderboard-ranking" className="text-sm font-semibold text-[var(--primary)] hover:underline">
                {t('guides.board_short')}
              </Link>
              <Link href="/buy-football-tips" className="text-sm font-semibold text-[var(--primary)] hover:underline">
                {t('buy.nav')}
              </Link>
            </nav>
          </div>
        </section>

        <HomeMarketingCollapse summary={`${t('home.for_sellers')} · ${t('home.features_title')}`}>
        <section className="py-6 sm:py-10 md:py-14 px-4 sm:px-6 lg:px-8 w-full min-w-0">
          <div className="section-ux-cap-4xl w-full min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 min-w-0">
              <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                <ArtworkNewsGuides className="h-11 w-11 sm:h-12 sm:w-12 shrink-0 text-[var(--primary)]" />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-[var(--text)] mb-0.5">{t('home.news_guides_title')}</h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">{t('home.news_guides_desc')}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-w-0">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <ArtworkExplore className="h-11 w-11 sm:h-12 sm:w-12 shrink-0 text-[var(--accent)]" />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--text)] mb-0.5">{t('home.explore_cta_title')}</h3>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">{t('home.explore_cta_desc')}</p>
                  </div>
                </div>
                <Link
                  href="/discover"
                  className={buttonClassName({ size: 'md', className: 'w-full sm:w-auto shrink-0' })}
                >
                  {t('home.explore_cta_btn')}
                </Link>
              </div>
            </div>
            <div className="mt-10 sm:mt-14 pt-10 sm:pt-12 border-t border-[var(--separator)]">
              <div className="text-center mb-8 sm:mb-10 px-1">
                <p className="text-xs sm:text-sm font-semibold text-[var(--accent)] uppercase tracking-wide mb-2" aria-hidden="true">{t('home.for_sellers')}</p>
                <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)] mb-3">
                  {t('home.tipster_flow_badge')}
                </p>
                <h2 className="font-display text-display-sm sm:text-display-md text-[var(--text)] mb-3 leading-snug">
                  {t('home.tipster_flow_title', sellVars)}
                </h2>
                <p className="text-[var(--text-muted)] text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
                  {t('home.tipster_flow_sub', sellVars)}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 min-w-0">
                <div className="flex flex-col items-center text-center min-w-0">
                  <div className="flex flex-col items-center gap-2 mb-3 w-full">
                    <ArtworkSellerAccount className="h-[3.25rem] w-[5.4rem] sm:h-14 sm:w-24 shrink-0 text-[var(--primary)]" />
                    <span className="text-[11px] font-bold text-[var(--text-tertiary)] tracking-widest">01</span>
                  </div>
                  <h3 className="font-display text-sm sm:text-base font-semibold text-[var(--text)] mb-2">{t('home.tipster_step1_title')}</h3>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">{t('home.tipster_step1_desc')}</p>
                </div>
                <div className="flex flex-col items-center text-center min-w-0">
                  <div className="flex flex-col items-center gap-2 mb-3 w-full">
                    <ArtworkSellerRoi className="h-[3.25rem] w-[5.4rem] sm:h-14 sm:w-24 shrink-0 text-[var(--accent)]" />
                    <span className="text-[11px] font-bold text-[var(--text-tertiary)] tracking-widest">02</span>
                  </div>
                  <h3 className="font-display text-sm sm:text-base font-semibold text-[var(--text)] mb-2">{t('home.tipster_step2_title', sellVars)}</h3>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">{t('home.tipster_step2_desc', sellVars)}</p>
                </div>
                <div className="flex flex-col items-center text-center min-w-0">
                  <div className="flex flex-col items-center gap-2 mb-3 w-full">
                    <ArtworkSellerPayout className="h-[3.25rem] w-[5.4rem] sm:h-14 sm:w-24 shrink-0 text-[var(--primary)]" />
                    <span className="text-[11px] font-bold text-[var(--text-tertiary)] tracking-widest">03</span>
                  </div>
                  <h3 className="font-display text-sm sm:text-base font-semibold text-[var(--text)] mb-2">{t('home.tipster_step3_title')}</h3>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">{t('home.tipster_step3_desc')}</p>
                </div>
              </div>
              <p className="text-center mt-6 sm:mt-8">
                <Link
                  href="/how-it-works"
                  className="inline-flex items-center justify-center min-h-[44px] px-4 text-sm font-semibold text-[var(--primary)] hover:underline rounded-lg"
                >
                  {t('discover.platform_howto_link')}
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* Platform Features — editorial list, not emoji bento */}
        <section className="py-8 md:py-14 border-t border-[var(--separator)] w-full min-w-0">
          <div className="section-ux-gutter-wide w-full min-w-0">
            <div className="text-center mb-10">
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)] mb-3">{t('home.features_badge')}</p>
              <h2 className="font-display text-display-sm md:text-display-md text-[var(--text)] mb-3">{t('home.features_title')}</h2>
              <p className="text-[var(--text-muted)] text-base max-w-xl mx-auto">{t('home.features_sub')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 min-w-0 max-w-4xl mx-auto">
              <div className="min-w-0 border-t border-[var(--separator)] pt-5">
                <h3 className="font-display text-base font-semibold text-[var(--text)] mb-2">
                  {t('home.feature_escrow_title')}
                </h3>
                <p className="text-sm text-[var(--text-muted)] mb-3 leading-relaxed">
                  {t('home.feature_escrow_desc')}
                </p>
                <ul className="space-y-1.5 mb-3">
                  {([
                    t('home.feature_escrow_bullet1'),
                    t('home.feature_escrow_bullet2'),
                    t('home.feature_escrow_bullet3'),
                  ]).map((item) => (
                    <li key={item} className="text-sm text-[var(--text-muted)] pl-3 border-l-2 border-[var(--primary)]/40">
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
                  {t('home.feature_escrow_disclaimer')}
                </p>
                <p className="mt-3 mb-0">
                  <Link href="/guides/purchase-protection" className="text-sm font-semibold text-[var(--primary)] hover:underline">
                    {t('guides.escrow_short')}
                  </Link>
                </p>
              </div>

              <div className="min-w-0 border-t border-[var(--separator)] pt-5">
                <h3 className="font-display text-base font-semibold text-[var(--text)] mb-2">
                  {t('home.feature_verified_title')}
                </h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  {t('home.feature_verified_desc', sellVars)}
                </p>
                <p className="mt-3 mb-0">
                  <Link href="/guides/evaluate-tipsters" className="text-sm font-semibold text-[var(--primary)] hover:underline">
                    {t('guides.eval_short')}
                  </Link>
                </p>
              </div>

              <div className="min-w-0 border-t border-[var(--separator)] pt-5">
                <h3 className="font-display text-base font-semibold text-[var(--text)] mb-2">
                  {t('home.feature_refunds_title')}
                </h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  {t('home.feature_refunds_desc')}
                </p>
                <p className="mt-3 mb-0">
                  <Link href="/guides/free-and-paid-picks" className="text-sm font-semibold text-[var(--primary)] hover:underline">
                    {t('guides.free_short')}
                  </Link>
                </p>
              </div>

              <div className="min-w-0 border-t border-[var(--separator)] pt-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-base font-semibold text-[var(--text)] mb-2">
                    {t('home.feature_marketplace_title')}
                  </h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    {t('home.feature_marketplace_desc')}
                  </p>
                </div>
                <Link
                  href="/marketplace"
                  className={buttonClassName({ size: 'md', className: 'w-full sm:w-auto shrink-0' })}
                >
                  {t('home.feature_marketplace_btn')}
                </Link>
              </div>

              <div className="min-w-0 border-t border-[var(--separator)] pt-5">
                <h3 className="font-display text-base font-semibold text-[var(--text)] mb-2">
                  {t('home.feature_stats_title')}
                </h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  {t('home.feature_stats_desc')}
                </p>
                <p className="mt-3 mb-0">
                  <Link href="/guides/read-tipster-stats" className="text-sm font-semibold text-[var(--primary)] hover:underline">
                    {t('guides.stats_short')}
                  </Link>
                </p>
              </div>

              <div className="min-w-0 border-t border-[var(--separator)] pt-5">
                <h3 className="font-display text-base font-semibold text-[var(--text)] mb-2">
                  {t('home.feature_leaderboard_title')}
                </h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  {t('home.feature_leaderboard_desc')}
                </p>
                <p className="mt-3 mb-0">
                  <Link href="/guides/leaderboard-ranking" className="text-sm font-semibold text-[var(--primary)] hover:underline">
                    {t('guides.board_short')}
                  </Link>
                </p>
              </div>
            </div>

            <div className="mt-10 max-w-md mx-auto">
              <HomeJoinCtaCard />
            </div>
          </div>
        </section>
        </HomeMarketingCollapse>
    </>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <UnifiedHeader />

      <main className="bg-[var(--bg)] w-full min-w-0">
        <HomePullToRefresh>
          <HomeHeroBanner />
          <Suspense fallback={<HomeStreamFallback />}>
            <HomeBelowFold />
          </Suspense>
        </HomePullToRefresh>
      </main>

      <AppFooter />
    </div>
  );
}
