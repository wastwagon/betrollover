'use client';

import Link from 'next/link';
import { useSlipCount } from '@/context/SlipCartContext';

const TELEGRAM_HANDLE = 'betrollovertips';
const TELEGRAM_URL = `https://t.me/${TELEGRAM_HANDLE}`;

// Placeholder URLs - replace when user provides links
const SOCIAL_LINKS = {
  twitter: '#',
  facebook: '#',
  instagram: '#',
  // add more as needed
};

export function TopBar() {
  const slipCount = useSlipCount();

  return (
    <div className="relative z-50 w-full bg-slate-800 text-slate-200 text-xs sm:text-sm border-b border-slate-700/60 overflow-hidden">
      <div className="flex items-center justify-between h-9 px-3 sm:px-4 gap-2">
        {/* Scrolling disclaimer */}
          <div className="flex-1 min-w-0 overflow-hidden">
          <div className="animate-marquee whitespace-nowrap inline-block" style={{ display: 'inline-block' }}>
            <span className="inline-block px-6">
              BetRollover is an educational platform—not a betting site. We provide insights to inform bettors&apos;
              decisions and promote responsible gambling. For entertainment only. 18+.
            </span>
            <span className="inline-block px-6" aria-hidden>
              BetRollover is an educational platform—not a betting site. We provide insights to inform bettors&apos;
              decisions and promote responsible gambling. For entertainment only. 18+.
            </span>
          </div>
        </div>

        {/* Right: socials, Telegram, cart */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Social icons - placeholder */}
          <div className="hidden sm:flex items-center gap-2">
            <a
              href={SOCIAL_LINKS.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md hover:bg-slate-700/60 transition-colors"
              aria-label="Twitter"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href={SOCIAL_LINKS.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md hover:bg-slate-700/60 transition-colors"
              aria-label="Facebook"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            <a
              href={SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md hover:bg-slate-700/60 transition-colors"
              aria-label="Instagram"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </a>
          </div>

          {/* Live Telegram support */}
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-600/80 hover:bg-sky-600 text-white font-medium transition-colors shrink-0"
            aria-label={`Live support on Telegram: @${TELEGRAM_HANDLE}`}
          >
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            <span className="hidden sm:inline">Live support</span>
          </a>

          {/* Cart icon - unfinished coupon */}
          <Link
            href="/create-pick"
            className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors ${
              slipCount > 0 ? 'bg-emerald-600/80 hover:bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
            }`}
            aria-label={slipCount > 0 ? `Unfinished coupon: ${slipCount} selection${slipCount !== 1 ? 's' : ''}` : 'Create coupon'}
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
        </div>
      </div>
    </div>
  );
}
