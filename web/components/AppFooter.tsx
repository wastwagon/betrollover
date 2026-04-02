'use client';

import Link from 'next/link';
import { AdSlot } from './AdSlot';
import { useT } from '@/context/LanguageContext';
import { TELEGRAM_ADS_HANDLE, TELEGRAM_ADS_URL } from '@/lib/site-config';

const footerLinkClass =
  'hover:text-[var(--primary)] transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2';

export function AppFooter() {
  const t = useT();
  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--bg-warm)]">
      <div className="section-ux-gutter-wide py-12">
        <AdSlot zoneSlug="footer" fullWidth className="flex justify-center mb-8 w-full max-w-4xl mx-auto" />

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8 border-b border-[var(--border)] pb-8">
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
          <div>
            <h3 className="font-semibold mb-3 text-[var(--text)]">{t('footer.discover')}</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2 mt-1">
              {t('header.section_explore')}
            </p>
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
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
          </div>
          <div>
            <h3 className="font-semibold mb-3 text-[var(--text)]">{t('header.section_platform_info')}</h3>
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

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 mb-8 pb-8 border-b border-[var(--border)]">
          <a
            href={TELEGRAM_ADS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-sky-600/90 hover:bg-sky-600 text-white text-sm font-semibold transition-colors"
            aria-label={`Telegram @${TELEGRAM_ADS_HANDLE}`}
          >
            <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            {t('footer.telegram_cta')}
          </a>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <span>&copy; {new Date().getFullYear()} BetRollover. {t('footer.rights')}</span>
          <span className="text-center max-w-xl">{t('footer.disclaimer')}</span>
        </div>
      </div>
    </footer>
  );
}
