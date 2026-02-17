import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { AdSlot } from '@/components/AdSlot';
import { NewsWidget } from '@/components/NewsWidget';
import { FeaturedPicks } from '@/components/FeaturedPicks';
import { HighValueCoupons } from '@/components/HighValueCoupons';
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

      <main>
        {/* Hero */}
        {/* Hero - Premium Dark Overhaul */}
        <section className="relative overflow-hidden min-h-[600px] flex items-center justify-center py-20 lg:py-32">
          {/* Animated Background Mesh */}
          <div className="absolute inset-0 bg-[var(--bg)]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[var(--primary)]/10 rounded-[100%] blur-[120px] animate-pulse-glow" />
            <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-blue-600/5 rounded-full blur-[120px]" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" />
          </div>

          <div className="relative max-w-7xl mx-auto px-6 text-center z-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8 animate-fade-in-up">
              <span className="flex h-2 w-2 rounded-full bg-[var(--success)] shadow-[0_0_10px_var(--success)] animate-pulse" />
              <span className="text-xs font-semibold text-[var(--primary)] tracking-wide uppercase">Ghana&apos;s Tipster Marketplace</span>
            </div>

            {/* Headline */}
            <h1 className="max-w-4xl mx-auto text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-8 animate-fade-in-up animate-delay-100 leading-[1.1]">
              Bet Smarter with <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] drop-shadow-sm">
                Verified Experts
              </span>
            </h1>

            <p className="max-w-2xl mx-auto text-lg md:text-xl text-[var(--text-muted)] mb-10 animate-fade-in-up animate-delay-200">
              Access premium insights from audited tipsters. Funds held in escrow until matches settle. <span className="text-white font-medium">Win or full refund.</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up animate-delay-300">
              <Link
                href="/register"
                className="group relative px-8 py-4 rounded-2xl font-bold text-base text-white shadow-xl shadow-[var(--primary)]/20 overflow-hidden w-full sm:w-auto"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] transition-all group-hover:scale-105" />
                <span className="relative flex items-center justify-center gap-2">
                  Join Free
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </span>
              </Link>
              <Link
                href="/marketplace"
                className="px-8 py-4 rounded-2xl font-bold text-base border border-white/10 text-white bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all w-full sm:w-auto backdrop-blur-sm"
              >
                Browse Picks
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="mt-12 pt-12 border-t border-white/5 flex flex-wrap justify-center gap-8 md:gap-16 animate-fade-in-up animate-delay-400">
              {[
                { label: 'Verified Tipsters', value: '100% Audited' },
                { label: 'Matches Tracked', value: '50k+' },
                { label: 'Secure Payments', value: 'Escrow Protected' },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-bold text-white">{stat.value}</span>
                  <span className="text-sm text-[var(--text-muted)]">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <AdSlot zoneSlug="home-below-hero" className="max-w-4xl mx-auto px-6 mb-6" />

        <HighValueCoupons />

        {/* How it works */}
        <section className="py-20 bg-[var(--bg)] relative">
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,var(--bg-warm),transparent)] opacity-20" />
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How It Works</h2>
              <p className="text-[var(--text-muted)] max-w-xl mx-auto">Start betting smarter in four simple steps</p>
            </div>

            <div className="grid md:grid-cols-4 gap-8">
              {[
                { step: 1, title: 'Browse', desc: 'Explore verified tips from top tipsters. Filter by sport, odds, and price.' },
                { step: 2, title: 'Choose', desc: 'Select tips that match your strategy. Single bets or accumulators.' },
                { step: 3, title: 'Purchase', desc: 'Pay securely. Funds held in escrow until matches settle.' },
                { step: 4, title: 'Win or Refund', desc: 'Get paid when tips win. Full refund if they lose.' },
              ].map((item) => (
                <div key={item.step} className="relative group">
                  <div className="relative z-10 bg-[var(--card)]/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6 h-full hover:border-[var(--primary)]/30 hover:-translate-y-1 transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-[var(--bg)] border border-white/10 text-[var(--primary)] flex items-center justify-center text-lg font-bold mb-6 group-hover:bg-[var(--primary)] group-hover:text-white transition-colors shadow-lg">
                      {item.step}
                    </div>
                    <h3 className="font-bold text-lg text-white mb-3">{item.title}</h3>
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed">{item.desc}</p>
                  </div>
                  {/* Subtle Glow behind cards */}
                  <div className="absolute inset-0 bg-[var(--primary)]/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <AdSlot zoneSlug="between-sections" className="max-w-4xl mx-auto px-6 py-10" />

        {/* Features */}
        <section className="py-20 bg-[var(--bg-warm)]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Why BetRollover?</h2>
              <p className="text-[var(--text-muted)]">Built on trust, transparency, and results</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: '🛡️', title: 'Escrow Protection', desc: 'Funds held until picks settle. Full refund if lose.' },
                { icon: '✓', title: 'Verified Stats', desc: 'Audited track records. No fake win rates.' },
                { icon: '🎁', title: 'Free & Premium', desc: 'Test free tips first. Upgrade when ready.' },
                { icon: '📱', title: 'Built for Ghana', desc: 'Mobile-first. Pay in GHS. Local methods.' },
              ].map((f) => (
                <div
                  key={f.title}
                  className="group p-6 rounded-2xl bg-[var(--card)] border border-white/5 hover:border-[var(--primary)]/30 transition-all duration-300 hover:shadow-2xl hover:shadow-black/50"
                >
                  <span className="text-4xl mb-6 block transform group-hover:scale-110 transition-transform">{f.icon}</span>
                  <h3 className="font-bold text-white text-lg mb-3">{f.title}</h3>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed group-hover:text-[var(--text-muted)]/80">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <FeaturedPicks />

        <NewsWidget />

        {/* CTA */}
        <section className="py-24 relative overflow-hidden bg-[var(--primary)]">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-black/20 to-transparent pointer-events-none" />

          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Ready to Bet Smarter?
            </h2>
            <p className="text-lg text-white/90 mb-10 max-w-xl mx-auto">
              Join thousands of winners using verified tips. Create your free account today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-block px-8 py-4 rounded-xl font-bold text-base bg-white text-[var(--primary)] hover:bg-gray-100 transition-colors shadow-xl"
              >
                Create Free Account
              </Link>
              <Link
                href="/about"
                className="inline-block px-8 py-4 rounded-xl font-bold text-base border-2 border-white/30 text-white hover:bg-white/10 transition-all"
              >
                Learn More
              </Link>
            </div>
          </div>
        </section>

        <AppFooter />
      </main>
    </div>
  );
}
