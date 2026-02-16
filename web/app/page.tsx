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
        <section className="relative overflow-hidden bg-[var(--bg-warm)]">
          <div className="absolute inset-0 bg-gradient-mesh" />
          <div className="absolute top-10 left-8 w-48 h-48 bg-[var(--primary)]/5 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-8 w-64 h-64 bg-[var(--accent)]/5 rounded-full blur-3xl" />
          <div className="relative max-w-6xl mx-auto px-6 py-14 md:py-20">
            <div className="text-center max-w-2xl mx-auto">
              <p className="text-xs font-semibold text-[var(--primary)] uppercase tracking-widest mb-3">
                Ghana&apos;s Tipster Marketplace
              </p>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[var(--text)] tracking-tight leading-[1.15]">
                Bet Smarter with <span className="text-[var(--primary)]">Verified Experts</span>
              </h1>
              <p className="mt-4 text-sm md:text-base text-[var(--text-muted)] max-w-lg mx-auto">
                Premium tips, escrow-protected. Win or full refund.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/register"
                  className="px-6 py-3 rounded-xl font-semibold text-sm bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
                >
                  Join Free
                </Link>
                <Link
                  href="/marketplace"
                  className="px-6 py-3 rounded-xl font-semibold text-sm border-2 border-[var(--primary)]/30 text-[var(--primary)] hover:bg-[var(--primary-light)] transition-all"
                >
                  Browse Picks
                </Link>
              </div>
              <div className="mt-5 flex flex-wrap justify-center gap-4 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Free</span>
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Escrow</span>
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Verified</span>
              </div>
            </div>
          </div>
        </section>

        <AdSlot zoneSlug="home-below-hero" className="max-w-4xl mx-auto px-6 mb-6" />

        <HighValueCoupons />

        {/* How it works */}
        <section className="py-12 md:py-16 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-10">
              <h2 className="text-xl md:text-2xl font-bold text-[var(--text)]">How It Works</h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Four steps to premium tips</p>
            </div>
            <div className="grid md:grid-cols-4 gap-6 md:gap-4">
              {[
                { step: 1, title: 'Browse', desc: 'Explore verified tips from top tipsters. Filter by sport, odds, and price.' },
                { step: 2, title: 'Choose', desc: 'Select tips that match your strategy. Single bets or accumulators.' },
                { step: 3, title: 'Purchase', desc: 'Pay securely. Funds held in escrow until matches settle.' },
                { step: 4, title: 'Win or Refund', desc: 'Get paid when tips win. Full refund if they lose.' },
              ].map((item) => (
                <div key={item.step} className="relative text-center group">
                  <div className="w-10 h-10 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center text-sm font-bold mx-auto mb-4 group-hover:bg-[var(--primary)] group-hover:text-white transition-all">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-base text-[var(--text)] mb-2">{item.title}</h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">{item.desc}</p>
                  {item.step < 4 && (
                    <div className="hidden md:block absolute top-5 left-[calc(50%+1.5rem)] w-[calc(100%-3rem)] h-0.5 bg-gradient-to-r from-[var(--border)] to-transparent" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <AdSlot zoneSlug="between-sections" className="max-w-4xl mx-auto px-6 py-6" />

        {/* Features */}
        <section className="py-12 md:py-16 bg-[var(--bg)]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-10">
              <h2 className="text-xl md:text-2xl font-bold text-[var(--text)]">Why BetRollover</h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Trust & transparency</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: '🛡️', title: 'Escrow Protection', desc: 'Funds held until picks settle. Full refund if lose.' },
                { icon: '✓', title: 'Verified Stats', desc: 'Audited track records. No fake win rates.' },
                { icon: '🎁', title: 'Free & Premium', desc: 'Test free tips first. Upgrade when ready.' },
                { icon: '📱', title: 'Built for Ghana', desc: 'Mobile-first. Pay in GHS. Local methods.' },
              ].map((f) => (
                <div
                  key={f.title}
                  className="p-5 rounded-xl bg-white border border-[var(--border)] hover:border-[var(--primary)]/30 hover:shadow-md transition-all"
                >
                  <span className="text-2xl">{f.icon}</span>
                  <h3 className="font-semibold text-[var(--text)] mt-3 mb-2 text-sm">{f.title}</h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <FeaturedPicks />

        <NewsWidget />

        {/* CTA */}
        <section className="py-12 md:py-16 bg-[var(--bg-warm)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-mesh pointer-events-none" />
          <div className="relative max-w-2xl mx-auto px-6 text-center">
            <h2 className="text-xl md:text-2xl font-bold text-[var(--text)] mb-2">
              Ready to Bet Smarter?
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              Join free. Create your account and explore verified tips.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/register"
                className="inline-block px-6 py-3 rounded-xl font-semibold text-sm bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
              >
                Create Free Account
              </Link>
              <Link
                href="/about"
                className="inline-block px-6 py-3 rounded-xl font-semibold text-sm border-2 border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)]/50 hover:text-[var(--primary)] transition-all"
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
