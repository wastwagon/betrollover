'use client';

import Link from 'next/link';
import { AdSlot } from './AdSlot';

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--bg)]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-5">
        <AdSlot zoneSlug="footer" className="flex justify-center mb-6" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8 border-b border-[var(--border)] pb-8">
          <div>
            <h3 className="font-semibold mb-3 text-[var(--text)]">Company</h3>
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
              <li><Link href="/about" className="hover:text-[var(--primary)]">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-[var(--primary)]">Contact</Link></li>
              <li><Link href="/news" className="hover:text-[var(--primary)]">News</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3 text-[var(--text)]">Features</h3>
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
              <li><Link href="/predictions" className="hover:text-[var(--primary)]">Smart Coupons</Link></li>
              <li><Link href="/marketplace" className="hover:text-[var(--primary)]">Marketplace</Link></li>
              <li><Link href="/tipsters" className="hover:text-[var(--primary)]">Top Tipsters</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3 text-[var(--text)]">Resources</h3>
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
              <li><Link href="/resources" className="hover:text-[var(--primary)]">Betting Guides</Link></li>
              <li><Link href="/leaderboard" className="hover:text-[var(--primary)]">Leaderboard</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3 text-[var(--text)]">Legal</h3>
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
              <li><Link href="/terms" className="hover:text-[var(--primary)]">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-[var(--primary)]">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <span>&copy; {new Date().getFullYear()} BetRollover. All rights reserved.</span>
          <span>Please gamble responsibly. 18+ only.</span>
        </div>
      </div>
    </footer>
  );
}
