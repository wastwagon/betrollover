'use client';

import Link from 'next/link';
import { AdSlot } from './AdSlot';

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--bg)]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-5">
        <AdSlot zoneSlug="footer" className="flex justify-center mb-4" />
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-[var(--text-muted)]">
          <Link
            href="/privacy"
            className="hover:text-[var(--text)] transition-colors duration-200"
          >
            Privacy
          </Link>
          <span className="hidden sm:inline text-[var(--border)]">·</span>
          <span className="text-xs">Please gamble responsibly. 18+ only.</span>
        </div>
      </div>
    </footer>
  );
}
