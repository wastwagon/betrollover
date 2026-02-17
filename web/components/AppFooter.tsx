'use client';

import Link from 'next/link';
import { AdSlot } from './AdSlot';

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-[var(--bg-warm)] relative overflow-hidden">
      {/* Footer glow effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-[var(--primary)]/20 to-transparent" />
      <div className="absolute -top-[200px] left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-[var(--primary)]/5 blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <AdSlot zoneSlug="footer" className="flex justify-center mb-10" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12 border-b border-white/5 pb-12">
          <div>
            <h3 className="font-bold mb-4 text-[var(--text)] text-sm uppercase tracking-wider">Company</h3>
            <ul className="space-y-3 text-sm text-[var(--text-muted)]">
              <li><Link href="/about" className="hover:text-[var(--primary)] transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-[var(--primary)] transition-colors">Contact</Link></li>
              <li><Link href="/news" className="hover:text-[var(--primary)] transition-colors">News</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold mb-4 text-[var(--text)] text-sm uppercase tracking-wider">Features</h3>
            <ul className="space-y-3 text-sm text-[var(--text-muted)]">
              <li><Link href="/predictions" className="hover:text-[var(--primary)] transition-colors">Smart Coupons</Link></li>
              <li><Link href="/marketplace" className="hover:text-[var(--primary)] transition-colors">Marketplace</Link></li>
              <li><Link href="/tipsters" className="hover:text-[var(--primary)] transition-colors">Top Tipsters</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold mb-4 text-[var(--text)] text-sm uppercase tracking-wider">Resources</h3>
            <ul className="space-y-3 text-sm text-[var(--text-muted)]">
              <li><Link href="/resources" className="hover:text-[var(--primary)] transition-colors">Betting Guides</Link></li>
              <li><Link href="/leaderboard" className="hover:text-[var(--primary)] transition-colors">Leaderboard</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold mb-4 text-[var(--text)] text-sm uppercase tracking-wider">Legal</h3>
            <ul className="space-y-3 text-sm text-[var(--text-muted)]">
              <li><Link href="/terms" className="hover:text-[var(--primary)] transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-[var(--primary)] transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
            <span>&copy; {new Date().getFullYear()} BetRollover. All rights reserved.</span>
          </div>
          <span className="opacity-60">Please gamble responsibly. 18+ only.</span>
        </div>
      </div>
    </footer>
  );
}
