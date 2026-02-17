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

      <main>
        {/* Hero Section - Mobile App Style */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[var(--bg-warm)] to-white py-16 lg:py-24">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-20 left-10 w-72 h-72 bg-[var(--primary)]/10 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-[var(--accent)]/10 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-4xl mx-auto px-6 text-center z-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border)] bg-white shadow-sm mb-6">
              <span className="flex h-2 w-2 rounded-full bg-[var(--success)]" />
              <span className="text-xs font-semibold text-[var(--text-muted)] tracking-wide uppercase">Secure Tipster Marketplace</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--text)] mb-4 leading-tight">
              BetRollover
            </h1>
            <p className="text-xl md:text-2xl text-[var(--text-muted)] mb-8 max-w-2xl mx-auto">
              Protect your bets with verified experts. Funds held in escrow until matches settle.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link
                href="/register"
                className="px-8 py-4 rounded-xl font-bold text-base text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
              >
                Create Account
              </Link>
              <Link
                href="/login"
                className="px-8 py-4 rounded-xl font-bold text-base border-2 border-[var(--border)] text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all w-full sm:w-auto"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--text)] mb-4">Platform Features</h2>
              <p className="text-[var(--text-muted)] max-w-2xl mx-auto">Everything you need for secure and profitable betting</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: 'Verified Tipsters',
                  description: '100% audited profiles with transparent performance tracking',
                  icon: '✓',
                  color: 'primary'
                },
                {
                  title: 'Escrow Protection',
                  description: 'Funds held securely until match completion',
                  icon: '🔒',
                  color: 'primary'
                },
                {
                  title: 'Fast Payouts',
                  description: 'Instant refunds on losses, quick withdrawals on wins',
                  icon: '⚡',
                  color: 'accent'
                },
                {
                  title: 'Trusted Platform',
                  description: 'Transparent performance tracking and user reviews',
                  icon: '⭐',
                  color: 'accent'
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="p-6 rounded-2xl border border-[var(--border)] bg-white hover:shadow-lg transition-shadow"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--${feature.color})] to-[var(--${feature.color}-hover)] flex items-center justify-center text-2xl mb-4 shadow-md`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text)] mb-2">{feature.title}</h3>
                  <p className="text-sm text-[var(--text-muted)]">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section className="py-16 bg-[var(--bg-warm)]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--text)] mb-4">Why Choose BetRollover?</h2>
              <p className="text-[var(--text-muted)] max-w-2xl mx-auto">Join thousands of users who trust our platform</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              {[
                { label: 'Secure', sublabel: 'Escrow System' },
                { label: 'Protected', sublabel: 'Payments' },
                { label: '24/7', sublabel: 'Support' },
                { label: 'Trusted', sublabel: 'Platform' },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center">
                  <div className="text-4xl font-bold text-[var(--primary)] mb-2">{item.label}</div>
                  <div className="text-sm text-[var(--text-muted)]">{item.sublabel}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust Indicators */}
        <section className="py-12 bg-white border-t border-[var(--border)]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-wrap justify-center gap-12 md:gap-16">
              {[
                { label: 'Verified Tipsters', value: '100%' },
                { label: 'Matches Tracked', value: '50k+' },
                { label: 'Secure Payments', value: 'Escrow' },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-bold text-[var(--text)]">{stat.value}</span>
                  <span className="text-sm text-[var(--text-muted)]">{stat.label}</span>
                </div>
              ))}
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
