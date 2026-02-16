import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { FeaturedPicks } from '@/components/FeaturedPicks';
import { HighValueCoupons } from '@/components/HighValueCoupons';
import { HomeStats } from '@/components/HomeStats';
import { AppFooter } from '@/components/AppFooter';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-[var(--bg-warm)]">
          <div className="absolute inset-0 bg-gradient-mesh" />
          <div className="absolute top-20 left-10 w-72 h-72 bg-[var(--primary)]/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-[var(--accent)]/5 rounded-full blur-3xl" />
          <div className="relative max-w-6xl mx-auto px-6 py-28 md:py-40">
            <div className="text-center max-w-3xl mx-auto">
              <p className="text-sm font-semibold text-[var(--primary)] uppercase tracking-widest mb-4 animate-fade-in-up">
                Ghana&apos;s Premier Tipster Marketplace
              </p>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-[var(--text)] tracking-tight leading-[1.08] animate-fade-in-up animate-delay-100">
                Bet Smarter with
                <span className="block mt-1 text-[var(--primary)]">Verified Experts</span>
              </h1>
              <p className="mt-8 text-lg md:text-xl text-[var(--text-muted)] leading-relaxed max-w-2xl mx-auto animate-fade-in-up animate-delay-200">
                Access premium football tips from vetted tipsters. Every purchase is escrow-protected—win or get a full refund.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animate-delay-300">
                <Link
                  href="/register"
                  className="px-8 py-4 rounded-2xl font-semibold text-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
                >
                  Start Free — Join Now
                </Link>
                <Link
                  href="/marketplace"
                  className="px-8 py-4 rounded-2xl font-semibold text-lg border-2 border-[var(--primary)]/30 text-[var(--primary)] hover:bg-[var(--primary-light)] hover:border-[var(--primary)]/50 transition-all duration-300"
                >
                  Browse Picks
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-[var(--text-muted)] animate-fade-in-up animate-delay-400">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> No credit card
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Free to join
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Escrow-protected
                </span>
              </div>
            </div>
          </div>
        </section>

        <HomeStats />

        <HighValueCoupons />

        {/* How it works */}
        <section className="py-24 md:py-32 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--text)]">How It Works</h2>
              <p className="mt-4 text-lg text-[var(--text-muted)] max-w-xl mx-auto">
                Four simple steps to access premium tips from Ghana&apos;s top tipsters
              </p>
            </div>
            <div className="grid md:grid-cols-4 gap-12 md:gap-8">
              {[
                { step: 1, title: 'Browse', desc: 'Explore verified tips from top tipsters. Filter by sport, odds, and price—free and premium picks available.' },
                { step: 2, title: 'Choose', desc: 'Select the tips that match your strategy. Single bets or accumulators—all with transparent track records.' },
                { step: 3, title: 'Purchase', desc: 'Pay securely. Funds are held in escrow until matches settle. Tipsters only get paid when you win.' },
                { step: 4, title: 'Win or Refund', desc: 'Get paid when tips win. Full refund if they lose. Zero risk on every purchase.' },
              ].map((item) => (
                <div key={item.step} className="relative text-center group">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center text-xl font-bold mx-auto mb-6 group-hover:bg-[var(--primary)] group-hover:text-white transition-all duration-300">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-lg text-[var(--text)] mb-3">{item.title}</h3>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">{item.desc}</p>
                  {item.step < 4 && (
                    <div className="hidden md:block absolute top-8 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-0.5 bg-gradient-to-r from-[var(--border)] to-transparent" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24 md:py-32 bg-[var(--bg)]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--text)]">Why BetRollover</h2>
              <p className="mt-4 text-lg text-[var(--text-muted)] max-w-xl mx-auto">
                The only tipster platform built for trust and transparency
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { icon: '🛡️', title: 'Escrow Protection', desc: 'Your money is held safely until picks settle. Tipsters only get paid when you win—full refund if they lose.' },
                { icon: '✓', title: 'Verified Track Records', desc: 'Every tipster has audited stats. No fake win rates or cherry-picked results. Real performance, real data.' },
                { icon: '🎁', title: 'Free & Premium Picks', desc: 'Start with free tips to test quality. Upgrade to premium when you find tipsters you trust.' },
                { icon: '📱', title: 'Built for Ghana', desc: 'Mobile-first design. Pay in GHS. Local payment methods. Optimized for African bettors.' },
              ].map((f) => (
                <div
                  key={f.title}
                  className="p-8 rounded-2xl bg-white border border-[var(--border)] hover:border-[var(--primary)]/30 hover:shadow-lg transition-all duration-300"
                >
                  <span className="text-3xl">{f.icon}</span>
                  <h3 className="font-semibold text-[var(--text)] mt-5 mb-3 text-lg">{f.title}</h3>
                  <p className="text-[var(--text-muted)] leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 md:py-32 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--text)]">Trusted by Bettors</h2>
              <p className="mt-4 text-lg text-[var(--text-muted)] max-w-xl mx-auto">
                See what our community says about BetRollover
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { quote: 'Escrow gives me peace of mind. I know my money is safe until the picks settle. No more scams.', name: 'Kofi M.', location: 'Accra' },
                { quote: 'Finally a platform where tipsters are verified. I can see real win rates before I buy. Game changer.', name: 'Ama O.', location: 'Kumasi' },
                { quote: 'I\'ve made back my losses and more. The refund when picks lose is a game-changer. Zero risk.', name: 'Kwame A.', location: 'Tamale' },
              ].map((t) => (
                <div
                  key={t.name}
                  className="p-8 rounded-2xl bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--primary)]/20 transition-all duration-300"
                >
                  <p className="text-[var(--text)] leading-relaxed text-lg">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[var(--primary-light)] flex items-center justify-center font-bold text-[var(--primary)]">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-[var(--text)]">{t.name}</p>
                      <p className="text-sm text-[var(--text-muted)]">{t.location}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <FeaturedPicks />

        {/* CTA */}
        <section className="py-24 md:py-32 bg-[var(--bg-warm)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-mesh pointer-events-none" />
          <div className="relative max-w-2xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--text)] mb-4">
              Ready to Bet Smarter?
            </h2>
            <p className="text-lg text-[var(--text-muted)] mb-10">
              Join thousands of smart bettors. Create your free account and start exploring verified tips today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-block px-8 py-4 rounded-2xl font-semibold text-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
              >
                Create Free Account
              </Link>
              <Link
                href="/about"
                className="inline-block px-8 py-4 rounded-2xl font-semibold text-lg border-2 border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)]/50 hover:text-[var(--primary)] transition-all duration-300"
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
