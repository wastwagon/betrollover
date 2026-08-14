'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { BottomSheet } from '@/components/ios/BottomSheet';
import { useT } from '@/context/LanguageContext';
import { getApiUrl, PLAY_STORE_URL } from '@/lib/site-config';
import { trackEvent } from '@/lib/analytics';
import { AUTH_STORAGE_SYNC } from '@/lib/auth-storage-sync';

const STORAGE_KEY = 'br_rate_app_prompt_v1';
const HIDE_PATH_PREFIXES = ['/admin', '/login', '/register', '/fr/admin', '/fr/login', '/fr/register'];

type PromptState = 'pending' | 'never' | 'done';

function readState(): PromptState {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'never' || v === 'done') return v;
  } catch {
    /* ignore */
  }
  return 'pending';
}

function writeState(v: PromptState) {
  try {
    localStorage.setItem(STORAGE_KEY, v);
  } catch {
    /* ignore */
  }
}

function shouldHide(pathname: string): boolean {
  return HIDE_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Ask for a Play Store rating after the user has experienced a settled purchase
 * (win or escrow refund / loss) — once per browser unless dismissed forever.
 */
export function RateAppPrompt() {
  const t = useT();
  const pathname = usePathname() || '/';
  const [open, setOpen] = useState(false);
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    if (shouldHide(pathname)) return;
    if (readState() !== 'pending') return;

    let cancelled = false;
    const run = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch(`${getApiUrl()}/accumulators/purchased`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const rows = Array.isArray(data) ? data : [];
        const settled = rows.some((row: { pick?: { result?: string } }) => {
          const r = row?.pick?.result;
          return r === 'won' || r === 'lost' || r === 'void';
        });
        if (!cancelled && settled) setEligible(true);
      } catch {
        /* ignore */
      }
    };

    void run();
    const onAuth = () => {
      void run();
    };
    window.addEventListener(AUTH_STORAGE_SYNC, onAuth);
    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_STORAGE_SYNC, onAuth);
    };
  }, [pathname]);

  useEffect(() => {
    if (!eligible || shouldHide(pathname) || readState() !== 'pending') return;
    const timer = window.setTimeout(() => {
      setOpen(true);
      const token = localStorage.getItem('token') || undefined;
      trackEvent('rate_app_shown', { path: pathname }, token);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [eligible, pathname]);

  if (shouldHide(pathname)) return null;

  const dismiss = (forever: boolean) => {
    const token = localStorage.getItem('token') || undefined;
    writeState(forever ? 'never' : 'done');
    trackEvent('rate_app_dismissed', { forever }, token);
    setOpen(false);
  };

  const rate = () => {
    const token = localStorage.getItem('token') || undefined;
    writeState('done');
    trackEvent('rate_app_clicked', { store: 'play' }, token);
    setOpen(false);
    window.open(PLAY_STORE_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <BottomSheet
      open={open}
      onClose={() => dismiss(false)}
      title={t('growth.rate_title')}
      maxHeightClass="max-h-[min(70dvh,420px)]"
    >
      <div className="px-4 pb-5 pt-1 space-y-4">
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">{t('growth.rate_body')}</p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={rate}
            className="touch-target w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity"
          >
            {t('growth.rate_cta')}
          </button>
          <button
            type="button"
            onClick={() => dismiss(false)}
            className="touch-target w-full rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            {t('growth.rate_later')}
          </button>
          <button
            type="button"
            onClick={() => dismiss(true)}
            className="touch-target w-full px-4 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            {t('growth.rate_never')}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
