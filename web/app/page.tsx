import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { AppFooter } from '@/components/AppFooter';
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
      <SiteHeader />

      <main className="bg-[var(--bg)]">
        {/* Bento Grid Section */}
        <section className="py-12 md:py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Bento Grid Container */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">

              {/* Large Card - Escrow Protection */}
              <div className="md:col-span-2 lg:row-span-2 p-8 md:p-10 rounded-3xl bg-gradient-to-br from-[var(--primary)]/10 via-[var(--primary)]/5 to-transparent border border-[var(--border)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex flex-col h-full justify-between">
                  <div>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] flex items-center justify-center text-3xl mb-6 shadow-lg group-hover:scale-110 transition-transform">
                      🔒
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-[var(--text)] mb-4">
                      Escrow Protection
                    </h2>
                    <p className="text-lg text-[var(--text-muted)] mb-6">
                      Your funds are held securely until matches settle. Win or get a full refund. No risk, complete transparency.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--primary)] font-semibold group-hover:gap-3 transition-all">
                    Learn More
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Medium Card - Verified Tipsters */}
              <div className="p-6 md:p-8 rounded-3xl bg-white border border-[var(--border)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-2xl mb-4 shadow-md">
                  ✓
                </div>
                <h3 className="text-xl font-bold text-[var(--text)] mb-2">
                  Verified Experts
                </h3>
                <p className="text-sm text-[var(--text-muted)]">
                  100% audited tipster profiles with transparent performance tracking
                </p>
              </div>

              {/* Medium Card - Fast Payouts */}
              <div className="p-6 md:p-8 rounded-3xl bg-white border border-[var(--border)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-2xl mb-4 shadow-md">
                  ⚡
                </div>
                <h3 className="text-xl font-bold text-[var(--text)] mb-2">
                  Instant Payouts
                </h3>
                <p className="text-sm text-[var(--text-muted)]">
                  Quick withdrawals on wins, instant refunds on losses
                </p>
              </div>

              {/* Wide Card - Marketplace Preview */}
              <div className="md:col-span-2 p-6 md:p-8 rounded-3xl bg-gradient-to-br from-[var(--bg-warm)] to-white border border-[var(--border)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold text-[var(--text)] mb-2">
                      Browse Tipster Marketplace
                    </h3>
                    <p className="text-sm text-[var(--text-muted)]">
                      Discover verified experts and their winning picks
                    </p>
                  </div>
                  <Link
                    href="/marketplace"
                    className="px-6 py-3 rounded-xl bg-[var(--primary)] text-white font-semibold hover:bg-[var(--primary-hover)] transition-all shadow-md hover:shadow-lg whitespace-nowrap group-hover:scale-105"
                  >
                    Explore Picks →
                  </Link>
                </div>
              </div>

              {/* Medium Card - Performance Tracking */}
              <div className="p-6 md:p-8 rounded-3xl bg-white border border-[var(--border)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-2xl mb-4 shadow-md">
                  📊
                </div>
                <h3 className="text-xl font-bold text-[var(--text)] mb-2">
                  Performance Tracking
                </h3>
                <p className="text-sm text-[var(--text-muted)]">
                  Real-time stats, ROI, and win rates for every tipster
                </p>
              </div>

              {/* Small Card - Join CTA */}
              <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-center items-center text-center">
                <h3 className="text-2xl font-bold mb-3">
                  Join Free
                </h3>
                <p className="text-sm opacity-90 mb-4">
                  Start protecting your bets today
                </p>
                <Link
                  href="/register"
                  className="px-6 py-3 rounded-xl bg-white text-[var(--primary)] font-semibold hover:bg-gray-50 transition-all shadow-md"
                >
                  Sign Up →
                </Link>
              </div>

              {/* Medium Card - Trust Indicator */}
              <div className="p-6 md:p-8 rounded-3xl bg-white border border-[var(--border)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-2xl mb-4 shadow-md">
                  ⭐
                </div>
                <h3 className="text-xl font-bold text-[var(--text)] mb-2">
                  Trusted Platform
                </h3>
                <p className="text-sm text-[var(--text-muted)]">
                  User reviews, ratings, and community feedback
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-lg mb-8 opacity-90">Join thousands of users who trust BetRollover for secure transactions</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="px-8 py-4 rounded-xl font-bold text-base bg-white text-[var(--primary)] hover:bg-gray-50 transition-all"
              >
                Create Account
              </Link>
              <Link
                href="/login"
                className="px-8 py-4 rounded-xl font-bold text-base border-2 border-white text-white hover:bg-white/10 transition-all"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
