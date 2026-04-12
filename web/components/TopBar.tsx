'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSlipCount } from '@/context/SlipCartContext';
import { useLanguage, useT } from '@/context/LanguageContext';
import { useCurrency } from '@/context/CurrencyContext';
import { trackEvent } from '@/lib/analytics';
import { TELEGRAM_ADS_HANDLE, TELEGRAM_ADS_URL } from '@/lib/site-config';

function Dropdown({ open, onClose, triggerRef, children }: {
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.right - 140, // min-w-[140px], align right edge
      });
    }
  }, [open, triggerRef]);

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
      className="fixed min-w-[140px] py-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-[200] animate-fade-in"
      style={{ top: position.top, left: position.left }}
      role="listbox"
    >
      {children}
    </div>
  );
  return createPortal(panel, document.body);
}

function TopBarSwitchers() {
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

  const btnCls = 'flex items-center gap-1 px-2 py-1 rounded-md text-slate-200 hover:bg-slate-700/60 transition-colors text-xs font-medium';

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
          <span>{currency.flag}</span>
          <span>{currency.code}</span>
          <svg className={`w-3 h-3 opacity-70 transition-transform ${currencyOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
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
                  ? 'bg-slate-700 text-emerald-400'
                  : 'text-slate-200 hover:bg-slate-700/80'
              }`}
            >
              <span className="text-base">{c.flag}</span>
              <span>{c.code}</span>
            </button>
          ))}
          <p className="px-3 py-2 mt-1 border-t border-slate-600 text-[10px] text-slate-400">For reference only. All transactions in GHS.</p>
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
          <span>{language.flag}</span>
          <span>{language.code.toUpperCase()}</span>
          <svg className={`w-3 h-3 opacity-70 transition-transform ${languageOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  ? 'bg-slate-700 text-emerald-400'
                  : 'text-slate-200 hover:bg-slate-700/80'
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

function isAdminRoute(pathname: string | null) {
  if (!pathname) return false;
  return pathname.startsWith('/admin') || pathname.startsWith('/fr/admin');
}

export function TopBar() {
  const pathname = usePathname();
  const slipCount = useSlipCount();
  const t = useT();
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  if (isAdminRoute(pathname)) {
    return null;
  }

  const disclaimerText = [
    t('topbar.disclaimer_1'),
    t('topbar.disclaimer_2'),
    t('topbar.disclaimer_3'),
    t('topbar.disclaimer_4'),
    t('topbar.disclaimer_5'),
  ].join(' • ');

  return (
    <div className="relative z-[60] w-full min-w-0 max-w-full bg-slate-800 text-slate-200 text-xs sm:text-sm border-b border-slate-700/60 overflow-x-hidden safe-area-inset-top">
      <div className="flex items-center justify-between min-h-9 h-auto sm:h-9 py-1 sm:py-0 px-3 sm:px-4 gap-2 min-w-0 max-w-full">
        {/* Scrolling disclaimer — seamless loop; static scroll when prefers-reduced-motion */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {reduceMotion ? (
            <div className="overflow-x-auto overflow-y-hidden [-webkit-overflow-scrolling:touch] pb-0.5">
              <p className="whitespace-nowrap pr-4 text-slate-300 leading-snug">{disclaimerText}</p>
            </div>
          ) : (
            <>
              <p className="sr-only">{disclaimerText}</p>
              <div className="overflow-hidden" aria-hidden="true">
                <div className="animate-marquee whitespace-nowrap inline-flex will-change-transform">
                  <span className="inline-block shrink-0 px-6">{disclaimerText}</span>
                  <span className="inline-block shrink-0 px-6">{disclaimerText}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: Telegram | cart | currency | language */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <a
            href={TELEGRAM_ADS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-600/80 hover:bg-sky-600 text-white font-medium transition-colors shrink-0"
            aria-label={`Live support on Telegram: @${TELEGRAM_ADS_HANDLE}`}
          >
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            <span className="hidden sm:inline">Live support</span>
          </a>

          {/* Cart icon — draft pick (create flow) */}
          <Link
            href="/create-pick"
            className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors shrink-0 ${
              slipCount > 0 ? 'bg-emerald-600/80 hover:bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
            }`}
            aria-label={
              slipCount > 0
                ? `Unfinished pick: ${slipCount} selection${slipCount !== 1 ? 's' : ''}`
                : 'Create pick'
            }
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            {slipCount > 0 && (
              <span className="min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-white/25 rounded-full">
                {slipCount > 9 ? '9+' : slipCount}
              </span>
            )}
          </Link>

          {/* Currency & Language */}
          <TopBarSwitchers />
        </div>
      </div>
    </div>
  );
}
