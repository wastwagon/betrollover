'use client';

import Link from 'next/link';
import { useT } from '@/context/LanguageContext';
import {
  APP_STORE_URL,
  PLAY_STORE_URL,
  TELEGRAM_ADS_HANDLE,
  TELEGRAM_ADS_URL,
} from '@/lib/site-config';
import { trackEvent } from '@/lib/analytics';

type GrowthDistributionStripProps = {
  className?: string;
  /** Tighter layout for marketplace / footer bands */
  compact?: boolean;
};

/**
 * P2 distribution: Telegram tips channel + install CTAs + escrow education deep link.
 */
export function GrowthDistributionStrip({ className = '', compact = false }: GrowthDistributionStripProps) {
  const t = useT();

  const token = () =>
    typeof window !== 'undefined' ? localStorage.getItem('token') || undefined : undefined;

  return (
    <aside
      className={`rounded-2xl border border-[var(--separator)] bg-[var(--card)] px-4 py-3.5 sm:px-5 sm:py-4 min-w-0 ${className}`}
    >
      <div className={`flex flex-col ${compact ? 'gap-2.5' : 'gap-3'} min-w-0`}>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text)]">{t('growth.strip_title')}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{t('growth.strip_sub')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={TELEGRAM_ADS_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('telegram_cta_clicked', { source: 'growth_strip' }, token())}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-500 transition-colors"
          >
            <span aria-hidden>✈</span>
            {t('growth.telegram_cta', { handle: TELEGRAM_ADS_HANDLE })}
          </a>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('install_cta_clicked', { source: 'growth_strip', store: 'play' }, token())}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2 text-xs font-semibold text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
          >
            {t('growth.play_cta')}
          </a>
          {APP_STORE_URL ? (
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackEvent('install_cta_clicked', { source: 'growth_strip', store: 'app_store' }, token())
              }
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2 text-xs font-semibold text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
            >
              {t('growth.app_store_cta')}
            </a>
          ) : null}
          <Link
            href="/guides/escrow-refunds"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-2 text-xs font-semibold text-[var(--primary)] hover:border-[var(--primary)] transition-colors"
          >
            {t('growth.escrow_case_cta')}
          </Link>
        </div>
      </div>
    </aside>
  );
}
