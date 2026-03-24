'use client';

import Link from 'next/link';
import { AdSlot } from './AdSlot';
import { useT } from '@/context/LanguageContext';

const footerLinkClass =
  'hover:text-[var(--primary)] transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2';

export function AppFooter() {
  const t = useT();
  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--bg-warm)]">
      <div className="section-ux-gutter-wide py-12">
        <AdSlot zoneSlug="footer" fullWidth className="flex justify-center mb-8 w-full max-w-4xl mx-auto" />

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8 border-b border-[var(--border)] pb-8">
          <div>
            <h3 className="font-semibold mb-3 text-[var(--text)]">{t('footer.company')}</h3>
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
              <li>
                <Link href="/support" className={footerLinkClass}>
                  {t('support.title')}
                </Link>
              </li>
              <li>
                <Link href="/tools/converter" className={footerLinkClass}>
                  {t('currency.selector_title')}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3 text-[var(--text)]">{t('footer.platform')}</h3>
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
              <li>
                <Link href="/marketplace" className={footerLinkClass}>
                  {t('nav.marketplace')}
                </Link>
              </li>
              <li>
                <Link href="/subscriptions/marketplace" className={footerLinkClass}>
                  {t('nav.subscription_marketplace')}
                </Link>
              </li>
              <li>
                <Link href="/league-tables" className={footerLinkClass}>
                  {t('nav.league_tables')}
                </Link>
              </li>
              <li>
                <Link href="/coupons/archive" className={footerLinkClass}>
                  {t('header.settled_archive')}
                </Link>
              </li>
              <li>
                <Link href="/tipsters" className={footerLinkClass}>
                  {t('nav.top_tipsters')}
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className={footerLinkClass}>
                  {t('nav.leaderboard')}
                </Link>
              </li>
            </ul>
          </div>
          <div className="col-span-2 md:col-span-1">
            <h3 className="font-semibold mb-3 text-[var(--text)]">{t('footer.discover')}</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2 mt-1">
              {t('header.section_explore')}
            </p>
            <ul className="space-y-2 text-sm text-[var(--text-muted)] mb-5">
              <li>
                <Link href="/discover" className={footerLinkClass}>
                  {t('nav.discover')}
                </Link>
              </li>
              <li>
                <Link href="/learn" className={footerLinkClass}>
                  {t('nav.learn')}
                </Link>
              </li>
              <li>
                <Link href="/news" className={footerLinkClass}>
                  {t('nav.news')}
                </Link>
              </li>
              <li>
                <Link href="/resources" className={footerLinkClass}>
                  {t('nav.guides')}
                </Link>
              </li>
              <li>
                <Link href="/community" className={footerLinkClass}>
                  {t('community.title')}
                </Link>
              </li>
              <li>
                <Link href="/about" className={footerLinkClass}>
                  {t('nav.about')}
                </Link>
              </li>
              <li>
                <Link href="/contact" className={footerLinkClass}>
                  {t('nav.contact')}
                </Link>
              </li>
            </ul>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
              {t('header.section_platform_info')}
            </p>
            <ul className="space-y-2 text-sm text-[var(--text-muted)] mb-5">
              <li>
                <Link href="/how-it-works" className={footerLinkClass}>
                  {t('home.how_it_works')}
                </Link>
              </li>
            </ul>
            <p className="text-xs text-[var(--text-muted)] border border-emerald-200/70 dark:border-emerald-800/60 rounded-lg p-3 bg-emerald-50/90 dark:bg-emerald-950/30">
              <span className="font-semibold text-emerald-900 dark:text-emerald-100">{t('resp.age_title')} </span>
              {t('header.age_disclaimer')}
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-3 text-[var(--text)]">{t('footer.legal')}</h3>
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
              <li>
                <Link href="/terms" className={footerLinkClass}>
                  {t('auth.terms')}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className={footerLinkClass}>
                  {t('auth.privacy')}
                </Link>
              </li>
              <li>
                <Link href="/responsible-gambling" className={footerLinkClass}>
                  {t('resp.headline')}
                </Link>
              </li>
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
