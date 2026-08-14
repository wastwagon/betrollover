'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { BottomSheet } from '@/components/ios/BottomSheet';
import { useT } from '@/context/LanguageContext';
import { getApiUrl, PLAY_STORE_URL } from '@/lib/site-config';
import { trackEvent } from '@/lib/analytics';
import { AUTH_STORAGE_SYNC } from '@/lib/auth-storage-sync';
import { Button } from '@/components/ui/Button';

const STORAGE_KEY = 'br_rate_app_prompt_v1';
const SNOOZE_MS = 1000 * 60 * 60 * 24 * 21; // 21 days
const HIDE_PATH_PREFIXES = ['/admin', '/login', '/register', '/fr/admin', '/fr/login', '/fr/register'];

type StoredPrompt =
  | { status: 'pending' }
  | { status: 'never' }
  | { status: 'done' }
  | { status: 'snoozed'; until: number };

function readStored(): StoredPrompt {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { status: 'pending' };
    if (raw === 'never') return { status: 'never' };
    if (raw === 'done') return { status: 'done' };
    if (raw === 'pending') return { status: 'pending' };
    const parsed = JSON.parse(raw) as StoredPrompt;
    if (parsed?.status === 'snoozed' && typeof parsed.until === 'number') {
      if (Date.now() >= parsed.until) return { status: 'pending' };
      return parsed;
    }
    if (parsed?.status === 'never' || parsed?.status === 'done' || parsed?.status === 'pending') {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return { status: 'pending' };
}

function writeStored(v: StoredPrompt) {
  try {
    if (v.status === 'pending') localStorage.removeItem(STORAGE_KEY);
    else if (v.status === 'never' || v.status === 'done') localStorage.setItem(STORAGE_KEY, v.status);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

function shouldHide(pathname: string): boolean {
  return HIDE_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Ask for a Play Store rating after the user has experienced a settled purchase
 * (win or escrow refund / loss). "Maybe later" snoozes; "Don't ask again" is permanent.
 */
export function RateAppPrompt() {
  const t = useT();
  const pathname = usePathname() || '/';
  const [open, setOpen] = useState(false);
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    if (shouldHide(pathname)) return;
    if (readStored().status !== 'pending') return;

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
    if (!eligible || shouldHide(pathname) || readStored().status !== 'pending') return;
    const timer = window.setTimeout(() => {
      setOpen(true);
      const token = localStorage.getItem('token') || undefined;
      trackEvent('rate_app_shown', { path: pathname }, token);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [eligible, pathname]);

  if (shouldHide(pathname)) return null;

  const closeSheet = () => setOpen(false);

  const snooze = () => {
    const token = localStorage.getItem('token') || undefined;
    writeStored({ status: 'snoozed', until: Date.now() + SNOOZE_MS });
    trackEvent('rate_app_dismissed', { forever: false, snoozed: true }, token);
    closeSheet();
  };

  const neverAsk = () => {
    const token = localStorage.getItem('token') || undefined;
    writeStored({ status: 'never' });
    trackEvent('rate_app_dismissed', { forever: true }, token);
    closeSheet();
  };

  const rate = () => {
    const token = localStorage.getItem('token') || undefined;
    writeStored({ status: 'done' });
    trackEvent('rate_app_clicked', { store: 'play' }, token);
    closeSheet();
    window.open(PLAY_STORE_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <BottomSheet
      open={open}
      onClose={snooze}
      title={t('growth.rate_title')}
      doneLabel={t('common.close')}
      maxHeightClass="max-h-[min(70dvh,420px)]"
    >
      <div className="px-4 pb-5 pt-1 space-y-4">
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">{t('growth.rate_body')}</p>
        <div className="flex flex-col gap-2">
          <Button type="button" onClick={rate} fullWidth>
            {t('growth.rate_cta')}
          </Button>
          <Button type="button" variant="secondary" onClick={snooze} fullWidth>
            {t('growth.rate_later')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={neverAsk}
            fullWidth
            className="text-xs"
          >
            {t('growth.rate_never')}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
