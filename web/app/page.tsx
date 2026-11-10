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
import { FaqJsonLd } from '@/components/FaqJsonLd';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { fetchSellingThresholds } from '@/lib/selling-thresholds';
import { fetchHomePublicData } from '@/lib/home-public-data';
import { fetchNewsHub } from '@/lib/seo/hub-public-data';
import { getLocale, buildT } from '@/lib/i18n';
import { buttonClassName } from '@/components/ui/button-styles';
import type { Metadata } from 'next';

/** ISR shell: hero + streamed below-fold; helps TTFB vs fully dynamic HTML. */
export const revalidate = 60;

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
  const [th, homeData, newsItems] = await Promise.all([
    fetchSellingThresholds({ revalidate: 300 }),
    fetchHomePublicData({ revalidate: 30 }),
    fetchNewsHub({ language: locale, revalidate: 120 }),
  ]);
  const sellVars = { minRoi: String(th.minimumROI), minWr: String(th.minimumWinRate) };
  const latestNews = newsItems
    .map((row) => {
      const slug = typeof row.slug === 'string' ? row.slug : '';
      const title = typeof row.title === 'string' ? row.title : '';
      if (!slug || !title) return null;
      const summary =
        (typeof row.excerpt === 'string' && row.excerpt) ||
        (typeof row.summary === 'string' && row.summary) ||
        (typeof row.description === 'string' && row.description) ||
        '';
      const publishedAt =
        (typeof row.publishedAt === 'string' && row.publishedAt) ||
        (typeof row.published_at === 'string' && row.published_at) ||
        (typeof row.createdAt === 'string' && row.createdAt) ||
        '';
      return { slug, title, summary: summary.trim(), publishedAt };
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .slice(0, 3);
  const homeFaqs = [
    { question: t('home.faq_q1'), answer: t('home.faq_a1') },
    { question: t('home.faq_q2'), answer: t('home.faq_a2') },
    { question: t('home.faq_q3'), answer: t('home.faq_a3') },
    { question: t('home.faq_q4'), answer: t('home.faq_a4') },
  ];

  return (
    <>
        <FaqJsonLd faqs={homeFaqs} />
        <HomeHero
          initialStats={homeData.stats}
          initialTodayMatches={homeData.todayMatches}
          marketplaceItems={homeData.marketplaceItems}
        />
        {/* Tipsters immediately after the banner — Tipstrr-style discovery */}
        <HomePopularTipsters initialLeaderboard={homeData.topTipsters} />
        <HomeFollowingShelf />
        <FeaturedPicks initialFeatured={homeData.featuredPicks} />
        <section id="free-tip-of-the-day" className="w-full min-w-0">
          <HomeFreeTipOfTheDay initialFreeTips={homeData.freeTips} />
        </section>
        <HomeQuickMarketplaceSections initialMarketItems={homeData.marketplaceItems} initialLeaderboard={homeData.topTipsters} />

        <section className="border-t border-[var(--separator)] w-full min-w-0" aria-labelledby="home-seo-body">
          <div className="section-ux-cap-4xl w-full min-w-0 px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
            <h2 id="home-seo-body" className="font-display text-lg sm:text-xl font-semibold text-[var(--text)] mb-3">
              {t('home.seo_body_h2')}
            </h2>
            <div className="space-y-3 text-sm sm:text-[15px] text-[var(--text-muted)] leading-relaxed max-w-3xl">
              <p>{t('home.seo_body_p1')}</p>
              <p>{t('home.seo_body_p2')}</p>
              <p>{t('home.seo_body_p3')}</p>
              <p>{t('home.seo_body_p4')}</p>
              <p>{t('home.seo_body_p5')}</p>
            </div>
            <p className="mt-4 text-sm font-semibold text-[var(--text)]">{t('home.seo_body_links')}</p>
            <nav className="mt-2 flex flex-wrap gap-x-4 gap-y-2" aria-label={t('home.seo_body_links')}>
              <Link href="/football-tips-ghana" className="text-sm font-semibold text-[var(--primary)] hover:underline">
                {t('home.seo_link_ghana')}
              </Link>
              <Link href="/buy-football-tips" className="text-sm font-semibold text-[var(--primary)] hover:underline">
                {t('home.seo_link_buy')}
              </Link>
              <Link href="/how-it-works" className="text-sm font-semibold text-[var(--primary)] hover:underline">
                {t('home.seo_link_how')}
              </Link>
              <Link href="/guides" className="text-sm font-semibold text-[var(--primary)] hover:underline">
                {t('home.seo_link_guides')}
              </Link>
            </nav>
            <p className="mt-4 text-xs text-[var(--text-tertiary)] leading-relaxed max-w-3xl">{t('home.seo_notice')}</p>
          </div>
        </section>

        <section className="border-t border-[var(--separator)] w-full min-w-0">
          <div className="section-ux-cap-4xl w-full min-w-0 px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)] mb-4">
              {t('home.how_it_works')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 min-w-0">
              {[
                { n: '01', title: t('home.step1_title'), desc: t('home.step1_desc') },
                { n: '02', title: t('home.step2_title'), desc: t('home.step2_desc') },
                { n: '03', title: t('home.step3_title'), desc: t('home.step3_desc') },
              ].map((step) => (
                <div
                  key={step.n}
                  className="min-w-0 rounded-2xl border border-[var(--separator)] bg-[var(--card)] px-4 py-4 sm:px-5 sm:py-5"
                >
                  <p className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--fill-secondary)] text-[12px] font-semibold tabular-nums text-[var(--text-muted)] mb-3">
                    {step.n}
                  </p>
                  <h3 className="font-display text-[15px] font-semibold text-[var(--text)] mb-1.5 leading-snug">
                    {step.title}
                  </h3>
                  <p className="text-[13px] text-[var(--text-muted)] leading-relaxed line-clamp-4">{step.desc}</p>
                </div>
              ))}
            </div>
            <nav
              className="mt-5 flex gap-2 overflow-x-auto overscroll-x-contain scrollbar-hide -mx-1 px-1 pb-1"
              aria-label={t('nav.short_guides')}
            >
              {[
                { href: '/guides/purchase-protection', label: t('guides.escrow_short') },
                { href: '/guides/evaluate-tipsters', label: t('guides.eval_short') },
                { href: '/guides/read-tipster-stats', label: t('guides.stats_short') },
                { href: '/guides/how-accumulators-settle', label: t('guides.acca_short') },
                { href: '/guides/free-and-paid-picks', label: t('guides.free_short') },
                { href: '/guides/leaderboard-ranking', label: t('guides.board_short') },
                { href: '/buy-football-tips', label: t('buy.nav') },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 rounded-full bg-[var(--fill-secondary)] px-3.5 py-2 text-[13px] font-semibold text-[var(--text)] no-underline hover:bg-[var(--separator)]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </section>

        <section className="border-t border-[var(--separator)] w-full min-w-0" aria-labelledby="home-faq">
          <div className="section-ux-cap-4xl w-full min-w-0 px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
            <h2 id="home-faq" className="font-display text-lg sm:text-xl font-semibold text-[var(--text)] mb-4">
              {t('home.faq_title')}
            </h2>
            <dl className="ios-grouped-section max-w-3xl overflow-hidden divide-y divide-[var(--separator)]">
              {homeFaqs.map((faq) => (
                <div key={faq.question} className="bg-[var(--card)] px-4 py-3.5 sm:px-5 sm:py-4">
                  <dt className="font-semibold text-[var(--text)] text-[15px]">{faq.question}</dt>
                  <dd className="mt-1.5 text-[14px] text-[var(--text-muted)] leading-relaxed">{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="border-t border-[var(--separator)] w-full min-w-0" aria-labelledby="home-sellers-cta">
          <div className="section-ux-cap-4xl w-full min-w-0 px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 id="home-sellers-cta" className="font-display text-lg sm:text-xl font-semibold text-[var(--text)]">
              {t('home.sellers_cta_title')}
            </h2>
            <Link
              href="/register"
              className={buttonClassName({ size: 'md', className: 'w-full sm:w-auto shrink-0' })}
            >
              {t('home.sellers_cta_btn')}
            </Link>
          </div>
        </section>

        <section className="border-t border-[var(--separator)] w-full min-w-0" aria-labelledby="home-news-block">
          <div className="section-ux-cap-4xl w-full min-w-0 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <h2 id="home-news-block" className="font-display text-base sm:text-lg font-semibold text-[var(--text)] mb-4">
              {t('home.news_block_title')}
            </h2>
            {latestNews.length > 0 ? (
              <ul className="ios-grouped-section max-w-3xl overflow-hidden divide-y divide-[var(--separator)]">
                {latestNews.map((article) => {
                  const dateLabel = article.publishedAt
                    ? new Date(article.publishedAt).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '';
                  return (
                    <li key={article.slug} className="min-w-0 bg-[var(--card)] px-4 py-3.5 sm:px-5 sm:py-4">
                      <Link
                        href={`/news/${encodeURIComponent(article.slug)}`}
                        className="text-[15px] font-semibold text-[var(--text)] no-underline hover:text-[var(--primary)]"
                      >
                        {article.title}
                      </Link>
                      {dateLabel ? (
                        <p className="text-[12px] text-[var(--text-tertiary)] mt-1">{dateLabel}</p>
                      ) : null}
                      {article.summary ? (
                        <p className="text-[14px] text-[var(--text-muted)] mt-1.5 leading-relaxed line-clamp-2">
                          {article.summary}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <nav className="flex flex-wrap gap-2" aria-label={t('home.news_block_title')}>
                <Link
                  href="/news"
                  className="rounded-full bg-[var(--fill-secondary)] px-3.5 py-2 text-[13px] font-semibold text-[var(--text)] no-underline"
                >
                  {t('nav.news')}
                </Link>
                <Link
                  href="/guides"
                  className="rounded-full bg-[var(--fill-secondary)] px-3.5 py-2 text-[13px] font-semibold text-[var(--text)] no-underline"
                >
                  {t('home.seo_link_guides')}
                </Link>
              </nav>
            )}
          </div>
        </section>

        <HomeMarketingCollapse summary={t('home.sellers_cta_title')}>
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
        {/* Hero stays outside client PTR so the LCP image is not gated on hydration. */}
        <HomeHeroBanner />
        <HomePullToRefresh>
          <Suspense fallback={<HomeStreamFallback />}>
            <HomeBelowFold />
          </Suspense>
        </HomePullToRefresh>
      </main>

      <AppFooter />
    </div>
  );
}
