'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdSlot } from './AdSlot';
import { useT } from '@/context/LanguageContext';
import { isSubscriptionsEnabled } from '@/lib/subscriptions-enabled';
import { GrowthDistributionStrip } from '@/components/GrowthDistributionStrip';
import { localizeHref } from '@/lib/locale-path';

const footerLinkClass =
  'text-[13px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60 focus-visible:ring-offset-2';

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
    <footer className="mt-auto border-t border-[var(--separator)] bg-[var(--bg)]">
      <div className="section-ux-gutter-wide py-10 sm:py-12">
        <AdSlot zoneSlug="footer" fullWidth className="flex justify-center mb-8 w-full max-w-3xl mx-auto" />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-8 pb-8 border-b border-[var(--separator)]">
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)] mb-3">
              {t('footer.platform')}
            </h3>
            <ul className="space-y-2.5">
              <li>
                <FooterLink href="/marketplace">{t('nav.marketplace')}</FooterLink>
              </li>
              <li>
                <FooterLink href="/buy-football-tips">{t('buy.nav')}</FooterLink>
              </li>
              <li>
                <FooterLink href="/tipsters">{t('nav.tipsters')}</FooterLink>
              </li>
              <li>
                <FooterLink href="/leaderboard">{t('nav.leaderboard')}</FooterLink>
              </li>
              <li>
                <FooterLink href="/rollover">{t('nav.rollover')}</FooterLink>
              </li>
              {isSubscriptionsEnabled() ? (
                <li>
                  <FooterLink href="/subscriptions/marketplace">{t('nav.subscription_marketplace')}</FooterLink>
                </li>
              ) : null}
            </ul>
          </div>
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)] mb-3">
              {t('footer.discover')}
            </h3>
            <ul className="space-y-2.5">
              <li>
                <FooterLink href="/how-it-works">{t('home.how_it_works')}</FooterLink>
              </li>
              <li>
                <FooterLink href="/guides">{t('nav.short_guides')}</FooterLink>
              </li>
              <li>
                <FooterLink href="/learn">{t('nav.learn')}</FooterLink>
              </li>
              <li>
                <FooterLink href="/football-tips-ghana">{t('footer.ghana_hub')}</FooterLink>
              </li>
              <li>
                <FooterLink href="/track-record">{t('footer.track_record')}</FooterLink>
              </li>
              <li>
                <FooterLink href="/support">{t('support.title')}</FooterLink>
              </li>
            </ul>
          </div>
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)] mb-3">
              {t('footer.legal')}
            </h3>
            <ul className="space-y-2.5 mb-4">
              <li>
                <FooterLink href="/about">{t('nav.about')}</FooterLink>
              </li>
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
            <p className="text-[12px] leading-relaxed text-[var(--text-muted)] rounded-xl border border-[var(--separator)] bg-[var(--fill-secondary)]/60 px-3 py-2.5">
              <span className="font-semibold text-[var(--text)]">{t('resp.age_title')} </span>
              {t('header.age_disclaimer')}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <GrowthDistributionStrip compact />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 text-[12px] text-[var(--text-muted)]">
          <span suppressHydrationWarning>
            &copy; {new Date().getFullYear()} BetRollover. {t('footer.rights')}
          </span>
          <p className="max-w-xl leading-relaxed sm:text-right">{t('footer.disclaimer')}</p>
        </div>
        <p className="mt-4 text-center text-[11px] text-[var(--text-tertiary)]">
          {t('footer.credits_design_deployed')}{' '}
          <a
            href="https://oceancyber.net/"
            target="_blank"
            rel="noopener noreferrer"
            className={footerLinkClass}
          >
            OceanCyber
          </a>
        </p>
      </div>
    </footer>
  );
}
