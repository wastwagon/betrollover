import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { AdSlot } from '@/components/AdSlot';
import { HomeHero } from '@/components/HomeHero';
import { HomePopularTipsters } from '@/components/HomePopularTipsters';
import { HomePopularEvents } from '@/components/HomePopularEvents';
import { HomeFreeTipOfTheDay } from '@/components/HomeFreeTipOfTheDay';
import { HomePublicChatRooms } from '@/components/HomePublicChatRooms';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, getAlternates } from '@/lib/site-config';
import { getLocale, buildT } from '@/lib/i18n';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Verified Sports Tips | Football, Basketball & More — ${SITE_NAME}`,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: SITE_URL,
    languages: getAlternates('/'),
  },
  openGraph: {
    url: SITE_URL,
    title: `Verified Sports Tips | Football, Basketball & More — ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
  },
};

export default async function HomePage() {
  const locale = await getLocale();
  const t = buildT(locale);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <BreadcrumbJsonLd items={[{ name: 'Home', url: SITE_URL }]} />
      <UnifiedHeader />

      <main className="bg-[var(--bg)]">
        <HomeHero />
        <div className="max-w-4xl mx-auto px-4 py-4">
          <AdSlot zoneSlug="home-below-hero" fullWidth className="w-full" />
        </div>
        {/* Quick links — key destinations without hamburger */}
        <section className="max-w-4xl mx-auto px-4 pb-6" aria-label="Quick links">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link href="/marketplace" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">🛒 {t('nav.marketplace')}</Link>
            <Link href="/tipsters" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">👥 {t('nav.tipsters')}</Link>
            <Link href="/discover" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">🔭 {t('nav.discover')}</Link>
            <Link href="/leaderboard" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">🏆 {t('nav.leaderboard')}</Link>
            <Link href="/community" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">💬 {t('nav.community')}</Link>
          </div>
        </section>
        <HomePopularTipsters />
        <section id="free-tip-of-the-day">
          <HomeFreeTipOfTheDay />
        </section>
        <HomePopularEvents />
        <div className="max-w-4xl mx-auto px-4 py-4">
          <AdSlot zoneSlug="between-sections" fullWidth className="w-full" />
        </div>
        <HomePublicChatRooms />
        {/* How It Works */}
        <section className="py-10 sm:py-14 md:py-20 px-4 sm:px-6 lg:px-8 border-t border-[var(--border)]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8 sm:mb-12 px-1">
              <span className="inline-block px-3 py-1.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-[10px] sm:text-xs font-semibold uppercase tracking-wide mb-3">{t('home.how_it_works')}</span>
              <h2 className="text-base font-semibold text-[var(--text)] mb-3 sm:text-lg md:text-xl leading-snug">{t('home.how_it_works_sub')}</h2>
              <p className="text-[var(--text-muted)] text-sm sm:text-base max-w-xl mx-auto leading-relaxed">{t('home.escrow_note')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-6">
              <div className="flex flex-col items-center text-center rounded-2xl border border-[var(--border)] bg-[var(--card)]/60 backdrop-blur-sm p-5 sm:p-6 shadow-sm">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-4 sm:mb-5 shrink-0">1</div>
                <h3 className="text-base font-semibold text-[var(--text)] mb-2">{t('home.step1_title')}</h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{t('home.step1_desc')}</p>
              </div>
              <div className="flex flex-col items-center text-center rounded-2xl border border-[var(--border)] bg-[var(--card)]/60 backdrop-blur-sm p-5 sm:p-6 shadow-sm">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-500/15 border-2 border-blue-500/30 flex items-center justify-center text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4 sm:mb-5 shrink-0">2</div>
                <h3 className="text-base font-semibold text-[var(--text)] mb-2">{t('home.step2_title')}</h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{t('home.step2_desc')}</p>
              </div>
              <div className="flex flex-col items-center text-center rounded-2xl border border-[var(--border)] bg-[var(--card)]/60 backdrop-blur-sm p-5 sm:p-6 shadow-sm">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-500/15 border-2 border-amber-500/30 flex items-center justify-center text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mb-4 sm:mb-5 shrink-0">3</div>
                <h3 className="text-base font-semibold text-[var(--text)] mb-2">{t('home.step3_title')}</h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{t('home.step3_desc')}</p>
              </div>
            </div>

            <div className="mt-8 sm:mt-12 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50/40 dark:from-slate-800/50 dark:to-emerald-900/20 border border-[var(--border)] flex items-start sm:items-center gap-3 sm:gap-4 min-h-0">
                <span className="text-3xl flex-shrink-0">📰</span>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text)] mb-0.5">{t('home.news_guides_title')}</h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">{t('home.news_guides_desc')}</p>
                </div>
              </div>
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-slate-800/50 dark:to-blue-900/20 border border-[var(--border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-[var(--text)] mb-0.5">{t('home.explore_cta_title')}</h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">{t('home.explore_cta_desc')}</p>
                </div>
                <Link
                  href="/discover"
                  className="inline-flex items-center justify-center px-4 py-3 sm:py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-hover)] transition-all shadow-md w-full sm:w-auto min-h-[44px] sm:min-h-0 shrink-0"
                >
                  {t('home.explore_cta_btn')}
                </Link>
              </div>
            </div>

            <div className="mt-10 sm:mt-14 pt-10 sm:pt-12 border-t border-[var(--border)]">
              <div className="text-center mb-8 sm:mb-10 px-1">
                <span className="inline-block px-3 py-1.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-300 text-[10px] sm:text-xs font-semibold uppercase tracking-wide mb-3">
                  {t('home.tipster_flow_badge')}
                </span>
                <h2 className="text-base font-semibold text-[var(--text)] mb-3 sm:text-lg md:text-xl leading-snug">
                  {t('home.tipster_flow_title')}
                </h2>
                <p className="text-[var(--text-muted)] text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
                  {t('home.tipster_flow_sub')}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                <div className="flex flex-col items-center text-center rounded-2xl border border-violet-500/15 dark:border-violet-800/30 bg-gradient-to-b from-violet-500/[0.06] to-[var(--card)]/80 p-5 sm:p-6 shadow-sm">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-violet-500/15 border-2 border-violet-500/30 flex items-center justify-center text-xl sm:text-2xl font-bold text-violet-600 dark:text-violet-400 mb-4 sm:mb-5 shrink-0">
                    1
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-[var(--text)] mb-2">{t('home.tipster_step1_title')}</h3>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">{t('home.tipster_step1_desc')}</p>
                </div>
                <div className="flex flex-col items-center text-center rounded-2xl border border-teal-500/15 dark:border-teal-800/30 bg-gradient-to-b from-teal-500/[0.06] to-[var(--card)]/80 p-5 sm:p-6 shadow-sm">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-teal-500/15 border-2 border-teal-500/30 flex items-center justify-center text-xl sm:text-2xl font-bold text-teal-600 dark:text-teal-400 mb-4 sm:mb-5 shrink-0">
                    2
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-[var(--text)] mb-2">{t('home.tipster_step2_title')}</h3>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">{t('home.tipster_step2_desc')}</p>
                </div>
                <div className="flex flex-col items-center text-center rounded-2xl border border-emerald-500/15 dark:border-emerald-800/30 bg-gradient-to-b from-emerald-500/[0.06] to-[var(--card)]/80 p-5 sm:p-6 shadow-sm">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-4 sm:mb-5 shrink-0">
                    3
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-[var(--text)] mb-2">{t('home.tipster_step3_title')}</h3>
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

        {/* Sports We Cover */}
        <section className="py-14 md:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-emerald-50/30 dark:from-slate-900/60 dark:to-slate-800/40 border-t border-[var(--border)]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wide mb-3">{t('nav.sports')}</span>
              <h2 className="text-base font-semibold text-[var(--text)] mb-3 sm:text-lg md:text-xl">{t('home.sports_title')}</h2>
              <p className="text-[var(--text-muted)] text-base max-w-xl mx-auto">{t('home.sports_sub')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {([
                {
                  icon: '⚽', name: 'Football', accent: 'border-emerald-400/60',
                  desc: 'Premier League, La Liga, Champions League & 1,000+ leagues. The most-tipped sport on the platform.',
                  markets: ['Match Winner', 'BTTS', 'Over/Under', 'Accumulators'],
                },
                {
                  icon: '🏀', name: 'Basketball', accent: 'border-orange-400/60',
                  desc: 'NBA, EuroLeague, and leagues worldwide. Moneyline, spreads, and totals across 420+ competitions.',
                  markets: ['Moneyline', 'Spreads', 'Totals', 'Props'],
                },
                {
                  icon: '🏉', name: 'Rugby', accent: 'border-amber-400/60',
                  desc: 'Rugby Union & League worldwide — UK, South Africa, Australia and more. Match winner, handicap, totals.',
                  markets: ['Match Winner', 'Handicap', 'Totals'],
                },
                {
                  icon: '🥊', name: 'MMA / Combat', accent: 'border-red-400/60',
                  desc: 'UFC, ONE Championship & Bellator. Fight winner, method of victory, and round-by-round predictions.',
                  markets: ['Fight Winner', 'Method', 'Round'],
                },
                {
                  icon: '🏐', name: 'Volleyball', accent: 'border-blue-400/60',
                  desc: 'Olympic tournaments and major leagues worldwide. Match winner, set totals, and handicap markets.',
                  markets: ['Match Winner', 'Set Totals', 'Handicap'],
                },
                {
                  icon: '🏒', name: 'Ice Hockey', accent: 'border-cyan-400/60',
                  desc: 'NHL, KHL & international leagues. Puck line, moneyline, over/under goals — 100+ leagues tracked.',
                  markets: ['Moneyline', 'Puck Line', 'Over/Under'],
                },
                {
                  icon: '🏈', name: 'American Football', accent: 'border-purple-400/60',
                  desc: 'NFL, NCAA & college football. Point spread, moneyline, totals, and division matchups.',
                  markets: ['Spread', 'Moneyline', 'Totals'],
                },
                {
                  icon: '🎾', name: 'Tennis', accent: 'border-yellow-400/60',
                  desc: 'Grand Slams, ATP & WTA Masters. Match winner, set betting, and games over/under across 200+ tournaments.',
                  markets: ['Match Winner', 'Set Betting', 'Games O/U'],
                },
              ] as { icon: string; name: string; accent: string; desc: string; markets: string[] }[]).map((sport) => (
                <div key={sport.name} className={`p-5 rounded-2xl bg-[var(--card)] border-2 ${sport.accent} shadow-sm hover:shadow-md transition-all duration-200`}>
                  <span className="text-3xl mb-3 block">{sport.icon}</span>
                  <h3 className="text-base font-semibold text-[var(--text)] mb-1.5">{sport.name}</h3>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-3">{sport.desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {sport.markets.map((m) => (
                      <span key={m} className="px-2 py-0.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs font-medium">{m}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Platform Features — Bento Grid */}
        <section className="py-14 md:py-20 border-t border-[var(--border)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Section header */}
            <div className="text-center mb-10">
              <span className="inline-block px-3 py-1 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs font-semibold uppercase tracking-wide mb-3">{t('home.features_badge')}</span>
              <h2 className="text-lg md:text-xl font-semibold text-[var(--text)] mb-3">{t('home.features_title')}</h2>
              <p className="text-[var(--text-muted)] text-base max-w-xl mx-auto">{t('home.features_sub')}</p>
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">

              {/* Large Card — Escrow Protection */}
              <div className="md:col-span-2 lg:row-span-2 p-6 md:p-8 rounded-2xl bg-gradient-to-br from-[var(--primary)]/10 via-[var(--primary)]/5 to-transparent border border-[var(--border)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex flex-col h-full">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] flex items-center justify-center text-2xl mb-5 shadow-lg group-hover:scale-110 transition-transform">
                    🔒
                  </div>
                  <h3 className="text-lg md:text-xl font-semibold text-[var(--text)] mb-3">
                    {t('home.feature_escrow_title')}
                  </h3>
                  <p className="text-base text-[var(--text-muted)] mb-4 leading-relaxed">
                    {t('home.feature_escrow_desc')}
                  </p>
                  <ul className="space-y-2 mb-5">
                    {([
                      t('home.feature_escrow_bullet1'),
                      t('home.feature_escrow_bullet2'),
                      t('home.feature_escrow_bullet3'),
                    ]).map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                        <span className="w-4 h-4 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center text-[10px] font-bold flex-shrink-0">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 p-3 rounded-lg mt-auto">
                    <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                      <strong>Disclaimer:</strong> {t('home.feature_escrow_disclaimer')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card — Verified Tipster Profiles */}
              <div className="p-5 md:p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-xl mb-4 shadow-md">
                  ✓
                </div>
                <h3 className="text-base font-bold text-[var(--text)] mb-2">
                  {t('home.feature_verified_title')}
                </h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  {t('home.feature_verified_desc')}
                </p>
              </div>

              {/* Card — Automatic Refunds */}
              <div className="p-5 md:p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-xl mb-4 shadow-md">
                  ↩️
                </div>
                <h3 className="text-base font-bold text-[var(--text)] mb-2">
                  {t('home.feature_refunds_title')}
                </h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  {t('home.feature_refunds_desc')}
                </p>
              </div>

              {/* Wide Card — Marketplace CTA */}
              <div className="md:col-span-2 p-5 md:p-6 rounded-2xl bg-gradient-to-br from-[var(--bg-warm)] to-[var(--card)] border border-[var(--border)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">🌍</span>
                      <h3 className="text-base font-semibold text-[var(--text)]">
                        {t('home.feature_marketplace_title')}
                      </h3>
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">
                      {t('home.feature_marketplace_desc')}
                    </p>
                  </div>
                  <Link
                    href="/marketplace"
                    className="px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold hover:bg-[var(--primary-hover)] transition-all shadow-md hover:shadow-lg whitespace-nowrap group-hover:scale-105 text-sm shrink-0"
                  >
                    {t('home.feature_marketplace_btn')}
                  </Link>
                </div>
              </div>

              {/* Card — Live Performance Stats */}
              <div className="p-5 md:p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xl mb-4 shadow-md">
                  📊
                </div>
<h3 className="text-base font-semibold text-[var(--text)] mb-2">
                {t('home.feature_stats_title')}
                </h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  {t('home.feature_stats_desc')}
                </p>
              </div>

              {/* Card — Join Free CTA */}
              <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-center items-center text-center">
                <h3 className="text-lg font-semibold mb-1">
                  {t('home.join_cta')}
                </h3>
                <p className="text-sm opacity-85 mb-4 leading-relaxed">
                  {t('home.join_subtitle')}
                </p>
                <Link
                  href="/register"
                  className="px-5 py-2.5 rounded-xl bg-white text-[var(--primary)] font-semibold hover:bg-gray-50 transition-all shadow-md text-sm"
                >
                  {t('auth.register')} →
                </Link>
              </div>

              {/* Card — Leaderboard & Rankings */}
              <div className="p-5 md:p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-xl mb-4 shadow-md">
                  🏆
                </div>
                <h3 className="text-base font-bold text-[var(--text)] mb-2">
                  {t('home.feature_leaderboard_title')}
                </h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  {t('home.feature_leaderboard_desc')}
                </p>
              </div>

            </div>
          </div>
        </section>

      </main>

      <AppFooter />
    </div>
  );
}
