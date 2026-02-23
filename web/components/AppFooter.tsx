'use client';

import Link from 'next/link';
import { AdSlot } from './AdSlot';
import { useT } from '@/context/LanguageContext';

export function AppFooter() {
  const t = useT();
  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--bg-warm)]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <AdSlot zoneSlug="footer" fullWidth className="flex justify-center mb-8 w-full max-w-4xl mx-auto" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8 border-b border-[var(--border)] pb-8">
          <div>
            <h3 className="font-semibold mb-3 text-[var(--text)]">{t('footer.company')}</h3>
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
              <li><Link href="/about" className="hover:text-[var(--primary)] transition-colors">{t('nav.about')}</Link></li>
              <li><Link href="/contact" className="hover:text-[var(--primary)] transition-colors">{t('nav.contact')}</Link></li>
              <li><Link href="/support" className="hover:text-[var(--primary)] transition-colors">{t('support.title')}</Link></li>
              <li><Link href="/community" className="hover:text-[var(--primary)] transition-colors">{t('community.title')}</Link></li>
              <li><Link href="/tools/converter" className="hover:text-[var(--primary)] transition-colors">{t('currency.selector_title')}</Link></li>
              <li><Link href="/news" className="hover:text-[var(--primary)] transition-colors">{t('nav.news')}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3 text-[var(--text)]">{t('footer.platform')}</h3>
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
              <li><Link href="/marketplace" className="hover:text-[var(--primary)] transition-colors">{t('nav.marketplace')}</Link></li>
              <li><Link href="/coupons/archive" className="hover:text-[var(--primary)] transition-colors">Settled Archive</Link></li>
              <li><Link href="/tipsters" className="hover:text-[var(--primary)] transition-colors">{t('nav.top_tipsters')}</Link></li>
              <li><Link href="/leaderboard" className="hover:text-[var(--primary)] transition-colors">{t('nav.leaderboard')}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3 text-[var(--text)]">Resources</h3>
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
              <li><Link href="/news" className="hover:text-[var(--primary)] transition-colors">{t('discover.news')}</Link></li>
              <li><Link href="/resources" className="hover:text-[var(--primary)] transition-colors">{t('nav.guides')}</Link></li>
              <li><Link href="/discover" className="hover:text-[var(--primary)] transition-colors">{t('nav.discover')}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3 text-[var(--text)]">{t('footer.legal')}</h3>
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
              <li><Link href="/terms" className="hover:text-[var(--primary)] transition-colors">{t('auth.terms')}</Link></li>
              <li><Link href="/privacy" className="hover:text-[var(--primary)] transition-colors">{t('auth.privacy')}</Link></li>
              <li><Link href="/responsible-gambling" className="hover:text-[var(--primary)] transition-colors">Responsible Use</Link></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <span>&copy; {new Date().getFullYear()} BetRollover. {t('footer.rights')}</span>
          <span className="text-center max-w-xl">{t('footer.disclaimer')}</span>
        </div>
      </div>
    </footer>
  );
}
