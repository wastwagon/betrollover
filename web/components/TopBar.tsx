'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage, useT } from '@/context/LanguageContext';
import { useCurrency } from '@/context/CurrencyContext';
import { trackEvent } from '@/lib/analytics';
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

  const btnCls =
    'flex items-center gap-1 px-2 py-1 rounded-md text-white/90 hover:bg-emerald-800/55 transition-colors text-xs font-medium';

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

  /** Matches bar height: safe-area + min row (min-h-9 + py-1). Keeps layout when bar is fixed on mobile. */
  const mobileSpacerStyle = { height: 'calc(env(safe-area-inset-top, 0px) + 2.75rem)' } as const;

  return (
    <>
      <div className="z-[60] w-full min-w-0 max-w-full bg-[#047857] text-white/95 text-xs sm:text-sm border-b border-emerald-900/40 overflow-x-hidden safe-area-inset-top max-md:fixed max-md:top-0 max-md:left-0 max-md:right-0 md:relative">
        <div className="flex items-center justify-between min-h-9 h-auto sm:h-9 py-1 sm:py-0 px-3 sm:px-4 gap-2 min-w-0 max-w-full">
          {/* Scrolling disclaimer — seamless loop; static scroll when prefers-reduced-motion */}
          <div className="flex-1 min-w-0 overflow-hidden">
            {reduceMotion ? (
              <div className="overflow-x-auto overflow-y-hidden [-webkit-overflow-scrolling:touch] pb-0.5">
                <p className="whitespace-nowrap pr-4 text-emerald-50/95 leading-snug">{disclaimerText}</p>
              </div>
            ) : (
              <>
                <p className="sr-only">{disclaimerText}</p>
                <div className="overflow-hidden" aria-hidden="true">
                  <div className="animate-marquee whitespace-nowrap inline-flex will-change-transform text-emerald-50/95">
                    <span className="inline-block shrink-0 px-6">{disclaimerText}</span>
                    <span className="inline-block shrink-0 px-6">{disclaimerText}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Currency & language only (live support + draft pick removed from top bar) */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <TopBarSwitchers />
          </div>
        </div>
      </div>
      {/* Reserve space when the bar is fixed so main content is not hidden underneath */}
      <div className="md:hidden w-full shrink-0 pointer-events-none" style={mobileSpacerStyle} aria-hidden />
    </>
  );
}
