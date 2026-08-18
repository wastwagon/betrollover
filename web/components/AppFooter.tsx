'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdSlot } from './AdSlot';
import { useT } from '@/context/LanguageContext';
import { isSubscriptionsEnabled } from '@/lib/subscriptions-enabled';
import { GrowthDistributionStrip } from '@/components/GrowthDistributionStrip';
import { localizeHref } from '@/lib/locale-path';

const footerLinkClass =
  'hover:text-[var(--primary)] transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2';

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <Link href={localizeHref(href, pathname)} className={footerLinkClass}>
      {children}
    </Link>
  );
}

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
                <FooterLink href="/support">
                  {t('support.title')}
                </FooterLink>
              </li>
              <li>
                <FooterLink href="/tools/converter">
                  {t('currency.selector_title')}
                </FooterLink>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3 text-[var(--text)]">{t('footer.platform')}</h3>
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
              <li>
                <FooterLink href="/marketplace">{t('nav.marketplace')}</FooterLink>
              </li>
              {isSubscriptionsEnabled() ? (
                <li>
                  <FooterLink href="/subscriptions/marketplace">{t('nav.subscription_marketplace')}</FooterLink>
                </li>
              ) : null}
              <li>
                <FooterLink href="/league-tables">{t('nav.league_tables')}</FooterLink>
              </li>
              <li>
                <FooterLink href="/coupons/archive">{t('header.settled_archive')}</FooterLink>
              </li>
              <li>
                <FooterLink href="/tipsters">{t('nav.top_tipsters')}</FooterLink>
              </li>
              <li>
                <FooterLink href="/leaderboard">{t('nav.leaderboard')}</FooterLink>
              </li>
              <li>
                <FooterLink href="/rollover">{t('nav.rollover')}</FooterLink>
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
                <FooterLink href="/discover">{t('nav.discover')}</FooterLink>
              </li>
              <li>
                <FooterLink href="/learn">{t('nav.learn')}</FooterLink>
              </li>
              <li>
                <FooterLink href="/news">{t('nav.news')}</FooterLink>
              </li>
              <li>
                <FooterLink href="/resources">{t('nav.guides')}</FooterLink>
              </li>
              <li>
                <FooterLink href="/guides">{t('nav.short_guides')}</FooterLink>
              </li>
              <li>
                <FooterLink href="/community">{t('community.title')}</FooterLink>
              </li>
              <li>
                <FooterLink href="/about">{t('nav.about')}</FooterLink>
              </li>
              <li>
                <FooterLink href="/contact">{t('nav.contact')}</FooterLink>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3 text-[var(--text)]">{t('header.section_platform_info')}</h3>
            <ul className="space-y-2 text-sm text-[var(--text-muted)] mb-5">
              <li>
                <FooterLink href="/how-it-works">{t('home.how_it_works')}</FooterLink>
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
                <FooterLink href="/terms">{t('auth.terms')}</FooterLink>
              </li>
              <li>
                <FooterLink href="/privacy">{t('auth.privacy')}</FooterLink>
              </li>
              <li>
                <FooterLink href="/responsible-gambling">{t('resp.headline')}</FooterLink>
              </li>
            </ul>
          </div>
        </div>

        <div className="mb-8 pb-8 border-b border-[var(--border)]">
          <GrowthDistributionStrip compact />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <span>&copy; {new Date().getFullYear()} BetRollover. {t('footer.rights')}</span>
          <span className="text-center max-w-xl">{t('footer.disclaimer')}</span>
        </div>
      </div>
    </footer>
  );
}
