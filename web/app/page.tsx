import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { HomeHero } from '@/components/HomeHero';
import { HomePopularTipsters } from '@/components/HomePopularTipsters';
import { HomePopularEvents } from '@/components/HomePopularEvents';
import { HomeFreeTipOfTheDay } from '@/components/HomeFreeTipOfTheDay';
import { SITE_URL, getAfricaAlternates } from '@/lib/site-config';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: {
    canonical: SITE_URL,
    languages: getAfricaAlternates(''),
  },
  openGraph: {
    url: SITE_URL,
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <UnifiedHeader />

      <main className="bg-[var(--bg)]">
        <HomeHero />
        <HomePopularTipsters />
        <section id="free-tip-of-the-day">
          <HomeFreeTipOfTheDay />
        </section>
        <HomePopularEvents />
        {/* How It Works - user journey (Tipstrr/TIPR-style, not duplicating bento features) */}
        <section className="py-12 md:py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--text)] mb-3 text-center">How It Works</h2>
            <p className="text-[var(--text-muted)] text-center mb-10 max-w-xl mx-auto">Get started in three simple steps. No subscriptions—pay only for the tips you want.</p>

            <div className="grid md:grid-cols-3 gap-8 md:gap-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-4">1</div>
                <h3 className="font-bold text-[var(--text)] mb-2">Browse & Compare</h3>
                <p className="text-sm text-[var(--text-muted)]">Explore verified tipsters, check win rates and ROI, and pick the best football tips for you. Free and paid picks available.</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/15 border-2 border-blue-500/30 flex items-center justify-center text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4">2</div>
                <h3 className="font-bold text-[var(--text)] mb-2">Pick a Coupon</h3>
                <p className="text-sm text-[var(--text-muted)]">Buy the tip or grab a free one. Funds go to escrow until the match settles. Follow top tipsters to stay updated.</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border-2 border-amber-500/30 flex items-center justify-center text-2xl font-bold text-amber-600 dark:text-amber-400 mb-4">3</div>
                <h3 className="font-bold text-[var(--text)] mb-2">Win or Refund</h3>
                <p className="text-sm text-[var(--text-muted)]">If the tip wins, you get your winnings. If it loses, we refund your purchase. No risk—your stakes are protected.</p>
              </div>
            </div>

            <div className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-slate-50 to-emerald-50/40 dark:from-slate-800/50 dark:to-emerald-900/20 border border-[var(--border)]">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-[var(--text)] mb-1">News & Betting Guides</h3>
                  <p className="text-sm text-[var(--text-muted)]">Football news, transfer updates, and guides to sharpen your edge. Stay informed before you bet.</p>
                </div>
                <Link
                  href="/discover"
                  className="px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold hover:bg-[var(--primary-hover)] transition-all shadow-md hover:shadow-lg whitespace-nowrap shrink-0"
                >
                  Explore Discover →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid Section */}
        <section className="py-10 md:py-14 lg:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Bento Grid Container */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">

              {/* Large Card - Escrow Protection */}
              <div className="md:col-span-2 lg:row-span-2 p-6 md:p-8 rounded-2xl bg-gradient-to-br from-[var(--primary)]/10 via-[var(--primary)]/5 to-transparent border border-[var(--border)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex flex-col h-full">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] flex items-center justify-center text-2xl mb-5 shadow-lg group-hover:scale-110 transition-transform">
                    🔒
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-[var(--text)] mb-3">
                    Escrow Protection
                  </h2>
                  <p className="text-base text-[var(--text-muted)] mb-4 leading-relaxed">
                    Your coupon purchase funds are held securely in escrow until matches settle. If the coupon loses, you receive a full refund of your purchase price directly to your account.
                  </p>
                  <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-lg mt-auto">
                    <p className="text-xs text-amber-800 leading-relaxed">
                      <strong>Important:</strong> Coupons shared by tipsters are for educational purposes only. We are not responsible for any betting losses. Please bet responsibly and within your means.
                    </p>
                  </div>
                </div>
              </div>

              {/* Medium Card - Verified Tipsters */}
              <div className="p-5 md:p-6 rounded-2xl bg-white border border-[var(--border)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-xl mb-3 shadow-md">
                  ✓
                </div>
                <h3 className="text-lg font-bold text-[var(--text)] mb-2">
                  Verified Experts
                </h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  100% audited tipster profiles with transparent performance tracking
                </p>
              </div>

              {/* Medium Card - Fast Payouts */}
              <div className="p-5 md:p-6 rounded-2xl bg-white border border-[var(--border)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-xl mb-3 shadow-md">
                  ⚡
                </div>
                <h3 className="text-lg font-bold text-[var(--text)] mb-2">
                  Instant Payouts
                </h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  Quick withdrawals on wins, instant refunds on losses
                </p>
              </div>

              {/* Wide Card - Marketplace Preview */}
              <div className="md:col-span-2 p-5 md:p-6 rounded-2xl bg-gradient-to-br from-[var(--bg-warm)] to-white border border-[var(--border)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-[var(--text)] mb-1">
                      Browse Tips & Tipster Marketplace
                    </h3>
                    <p className="text-sm text-[var(--text-muted)]">
                      Discover verified experts and their winning picks
                    </p>
                  </div>
                  <Link
                    href="/marketplace"
                    className="px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold hover:bg-[var(--primary-hover)] transition-all shadow-md hover:shadow-lg whitespace-nowrap group-hover:scale-105 text-sm"
                  >
                    Explore Picks →
                  </Link>
                </div>
              </div>

              {/* Medium Card - Performance Tracking */}
              <div className="p-5 md:p-6 rounded-2xl bg-white border border-[var(--border)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xl mb-3 shadow-md">
                  📊
                </div>
                <h3 className="text-lg font-bold text-[var(--text)] mb-2">
                  Win Rate, ROI, Rank & Streak
                </h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  Real-time stats, ROI, and win rates for every tipster
                </p>
              </div>

              {/* Small Card - Join CTA */}
              <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-center items-center text-center">
                <h3 className="text-xl font-bold mb-2">
                  Join Free
                </h3>
                <p className="text-sm opacity-90 mb-3">
                  Start protecting your bets today
                </p>
                <Link
                  href="/register"
                  className="px-5 py-2.5 rounded-xl bg-white text-[var(--primary)] font-semibold hover:bg-gray-50 transition-all shadow-md text-sm"
                >
                  Sign Up →
                </Link>
              </div>

              {/* Medium Card - Trust Indicator */}
              <div className="p-5 md:p-6 rounded-2xl bg-white border border-[var(--border)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-xl mb-3 shadow-md">
                  ⭐
                </div>
                <h3 className="text-lg font-bold text-[var(--text)] mb-2">
                  Trusted Platform
                </h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  User reviews, ratings, and community feedback
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
