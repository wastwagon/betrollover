'use client';

import Link from 'next/link';
import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useCurrency } from '@/context/CurrencyContext';
import { trackEvent } from '@/lib/analytics';
import { localizeHref, stripLocalePrefix } from '@/lib/locale-path';
import { TELEGRAM_ADS_URL } from '@/lib/site-config';

function Dropdown({
  open, onClose, triggerRef, children, align = 'right', minWidth = 140, onPanelEnter, onPanelLeave, role = 'listbox',
}: {
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  children: React.ReactNode;
  align?: 'left' | 'right';
  minWidth?: number;
  onPanelEnter?: () => void;
  onPanelLeave?: () => void;
  role?: 'listbox' | 'menu';
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const rawLeft = align === 'right' ? rect.right - minWidth : rect.left;
      const maxLeft = typeof window !== 'undefined' ? window.innerWidth - minWidth - 8 : rawLeft;
      setPosition({
        top: rect.bottom + 4,
        left: Math.max(8, Math.min(rawLeft, maxLeft)),
      });
    }
  }, [open, triggerRef, align, minWidth]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose, triggerRef]);

  if (!open || typeof document === 'undefined') return null;
  const panel = (
    <div
      ref={panelRef}
      className="fixed py-1 bg-[var(--card-elevated)] border border-[var(--border)] rounded-[var(--radius-sm)] shadow-card z-[200] animate-fade-in"
      style={{ top: position.top, left: position.left, minWidth }}
      role={role}
      onMouseEnter={onPanelEnter}
      onMouseLeave={onPanelLeave}
    >
      {children}
    </div>
  );
  return createPortal(panel, document.body);
}

export function LocaleSwitchers({ tone = 'onPrimary' }: { tone?: 'onPrimary' | 'onSurface' | 'quiet' }) {
  const pathname = usePathname();
  const router = useRouter();
  const { language, languages, setLang } = useLanguage();
  const { currency, currencies, setCurrencyCode } = useCurrency();
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const currencyBtnRef = useRef<HTMLButtonElement>(null);
  const languageBtnRef = useRef<HTMLButtonElement>(null);

  const switchLanguage = (code: import('@/context/LanguageContext').SupportedLanguage) => {
    const prev = language.code;
    setLang(code);
    trackEvent('language_change', { from: prev, to: code });
    const isFrPath = pathname.startsWith('/fr/') || pathname === '/fr';
    if (code === 'fr' && !isFrPath) router.push('/fr' + (pathname === '/' ? '' : pathname));
    else if (code === 'en' && isFrPath) router.push(pathname.slice(3) || '/');
  };

  const btnCls =
    tone === 'quiet'
      ? 'flex items-center gap-0.5 px-1.5 py-1 rounded-md text-[11px] font-semibold tracking-wide text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--fill-secondary)] transition-colors'
      : tone === 'onSurface'
      ? 'flex items-center gap-1 px-2 py-1 rounded-md text-[var(--text-muted)] hover:bg-[var(--fill-secondary)] hover:text-[var(--text)] transition-colors text-xs font-medium border border-[var(--border)] bg-[var(--card)]'
      : 'flex items-center gap-1 px-2 py-1 rounded-md text-white hover:bg-white/15 transition-colors text-xs font-medium';

  return (
    <>
      <div className="relative">
        <button
          type="button"
          ref={currencyBtnRef}
          onClick={() => { setLanguageOpen(false); setCurrencyOpen((v) => !v); }}
          className={btnCls}
          aria-label={`Change currency (currently ${currency.code})`}
          aria-haspopup="listbox"
          aria-expanded={currencyOpen}
        >
          {tone === 'onPrimary' ? <span>{currency.flag}</span> : null}
          <span>{currency.code}</span>
          <svg className={`w-3 h-3 transition-transform ${currencyOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <Dropdown open={currencyOpen} onClose={() => setCurrencyOpen(false)} triggerRef={currencyBtnRef}>
          {currencies.map((c) => (
            <button
              type="button"
              key={c.code}
              onClick={() => {
                const prev = currency.code;
                setCurrencyCode(c.code);
                if (prev !== c.code) trackEvent('currency_change', { from: prev, to: c.code });
                setCurrencyOpen(false);
              }}
              role="option"
              aria-selected={c.code === currency.code}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                c.code === currency.code
                  ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                  : 'text-[var(--text)] hover:bg-[var(--fill-secondary)]'
              }`}
            >
              <span className="text-base">{c.flag}</span>
              <span>{c.code}</span>
            </button>
          ))}
          <p className="px-3 py-2 mt-1 border-t border-[var(--separator)] text-[10px] text-[var(--text-tertiary)]">For reference only. All transactions in GHS.</p>
        </Dropdown>
      </div>

      <div className="relative">
        <button
          type="button"
          ref={languageBtnRef}
          onClick={() => { setCurrencyOpen(false); setLanguageOpen((v) => !v); }}
          className={btnCls}
          aria-label={`Change language (currently ${language.code.toUpperCase()})`}
          aria-haspopup="listbox"
          aria-expanded={languageOpen}
        >
          {tone === 'onPrimary' ? <span>{language.flag}</span> : null}
          <span>{language.code.toUpperCase()}</span>
          <svg className={`w-3 h-3 transition-transform ${languageOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <Dropdown open={languageOpen} onClose={() => setLanguageOpen(false)} triggerRef={languageBtnRef}>
          {languages.map((l) => (
            <button
              type="button"
              key={l.code}
              onClick={() => {
                switchLanguage(l.code);
                setLanguageOpen(false);
              }}
              role="option"
              aria-selected={l.code === language.code}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                l.code === language.code
                  ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                  : 'text-[var(--text)] hover:bg-[var(--fill-secondary)]'
              }`}
            >
              <span className="text-base">{l.flag}</span>
              <span>{l.nativeLabel}</span>
            </button>
          ))}
        </Dropdown>
      </div>
    </>
  );
}

function isActivePath(pathname: string, href: string) {
  const path = stripLocalePrefix(pathname);
  if (href === '/') return path === '/';
  return path === href || path.startsWith(href + '/');
}

type RailItem = { href: string; labelKey: string; live?: boolean };

const MATCH_LINKS: RailItem[] = [
  { href: '/live-scores', labelKey: 'nav.live_scores', live: true },
  { href: '/league-tables', labelKey: 'nav.league_tables' },
  { href: '/coupons/archive', labelKey: 'topbar.archive' },
];

const EDITORIAL_LINKS: RailItem[] = [
  { href: '/news', labelKey: 'nav.news' },
  { href: '/community', labelKey: 'topbar.community' },
];

const LEARN_LINKS: RailItem[] = [
  { href: '/learn', labelKey: 'nav.learn' },
  { href: '/guides', labelKey: 'nav.short_guides' },
];

const HELP_LINKS: RailItem[] = [
  { href: '/how-it-works', labelKey: 'home.how_it_works' },
  { href: '/about', labelKey: 'nav.about' },
  { href: '/support', labelKey: 'topbar.support' },
];

function railLinkClass() {
  return 'inline-flex shrink-0 items-center gap-1.5 rounded-sm px-2 py-1 text-[11px] font-medium tracking-[0.02em] whitespace-nowrap text-white hover:text-white transition-colors';
}

function RailLink({ item, pathname, label }: { item: RailItem; pathname: string; label: string }) {
  return (
    <Link href={localizeHref(item.href, pathname)} className={railLinkClass()}>
      {item.live ? (
        <span className="relative flex h-1.5 w-1.5" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
        </span>
      ) : null}
      {label}
    </Link>
  );
}

function RailDivider() {
  return <span className="mx-2.5 h-3 w-px shrink-0 bg-white" aria-hidden />;
}

function RailMenu({
  label,
  items,
  pathname,
  t,
}: {
  label: string;
  items: RailItem[];
  pathname: string;
  t: (key: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  };

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  return (
    <div className="relative" onMouseEnter={() => { cancelClose(); setOpen(true); }} onMouseLeave={scheduleClose}>
      <button
        type="button"
        ref={triggerRef}
        className={railLinkClass()}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {label}
        <svg className={`h-2.5 w-2.5 text-white transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <Dropdown
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={triggerRef}
        align="left"
        minWidth={176}
        role="menu"
        onPanelEnter={cancelClose}
        onPanelLeave={scheduleClose}
      >
        {items.map((item) => {
          const itemActive = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={localizeHref(item.href, pathname)}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={`block w-full px-3 py-2 text-left text-[13px] transition-colors ${
                itemActive
                  ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                  : 'text-[var(--text)] hover:bg-[var(--fill-secondary)]'
              }`}
            >
              {t(item.labelKey)}
            </Link>
          );
        })}
      </Dropdown>
    </div>
  );
}

/**
 * Desktop utility rail — grouped like a premium match-centre strip, not a sitemap.
 * Hidden on small screens; GHS/EN stay in UnifiedHeader there.
 */
export function TopBar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <div className="hidden md:flex h-[var(--br-topbar-h)] items-center bg-[#111111] text-white">
      <div className="relative flex w-full min-w-0 items-center justify-center px-4 sm:px-6 lg:px-8 xl:px-10">
        <nav className="flex min-w-0 max-w-[calc(100%-11rem)] lg:max-w-[calc(100%-14rem)] items-center justify-center overflow-x-auto scrollbar-hide" aria-label={t('footer.discover')}>
          {MATCH_LINKS.map((item) => (
            <RailLink key={item.href} item={item} pathname={pathname} label={t(item.labelKey)} />
          ))}
          <RailDivider />
          {EDITORIAL_LINKS.map((item) => (
            <RailLink key={item.href} item={item} pathname={pathname} label={t(item.labelKey)} />
          ))}
          <RailDivider />
          <RailMenu label={t('nav.learn')} items={LEARN_LINKS} pathname={pathname} t={t} />
          <RailMenu label={t('topbar.help')} items={HELP_LINKS} pathname={pathname} t={t} />
        </nav>

        <div className="absolute right-4 sm:right-6 lg:right-8 xl:right-10 top-1/2 -translate-y-1/2 flex shrink-0 items-center gap-2">
          <a
            href={TELEGRAM_ADS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:inline text-[11px] font-medium tracking-wide text-white hover:text-white transition-colors whitespace-nowrap"
            onClick={() => trackEvent('telegram_cta_clicked', { source: 'topbar' })}
          >
            {t('footer.telegram_cta')}
          </a>
          <Link
            href={localizeHref('/responsible-gambling', pathname)}
            className="text-[10px] font-semibold tracking-wider text-white hover:text-white transition-colors"
            title={t('topbar.disclaimer_5')}
          >
            18+
          </Link>
          <LocaleSwitchers tone="onPrimary" />
        </div>
      </div>
    </div>
  );
}
