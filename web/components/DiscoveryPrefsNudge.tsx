'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BottomSheet } from '@/components/ios/BottomSheet';
import { useT } from '@/context/LanguageContext';
import { AUTH_STORAGE_SYNC } from '@/lib/auth-storage-sync';

export type DiscoveryDeskPref = 'all' | 'acca_desk' | 'community';

const STORAGE_KEY = 'br_discovery_prefs_v1';

type Stored =
  | { status: 'done'; desk: DiscoveryDeskPref }
  | { status: 'skipped' }
  | { status: 'snoozed'; until: number };

export function readDiscoveryDeskPref(): DiscoveryDeskPref | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (parsed?.status === 'done' && (parsed.desk === 'all' || parsed.desk === 'acca_desk' || parsed.desk === 'community')) {
      return parsed.desk;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeStored(v: Stored) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

function canPrompt(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return true;
    const parsed = JSON.parse(raw) as Stored;
    if (parsed?.status === 'done' || parsed?.status === 'skipped') return false;
    if (parsed?.status === 'snoozed' && typeof parsed.until === 'number') {
      return Date.now() >= parsed.until;
    }
  } catch {
    /* ignore */
  }
  return true;
}

const HIDE = ['/admin', '/login', '/register', '/fr/admin', '/fr/login', '/fr/register'];

/**
 * One-time discovery preference: Acca Desk vs Community vs All.
 * Marketplace reads `readDiscoveryDeskPref()` on mount.
 */
export function DiscoveryPrefsNudge() {
  const t = useT();
  const pathname = usePathname() || '/';
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const sync = () => setAuthed(!!localStorage.getItem('token'));
    sync();
    window.addEventListener(AUTH_STORAGE_SYNC, sync);
    return () => window.removeEventListener(AUTH_STORAGE_SYNC, sync);
  }, []);

  useEffect(() => {
    if (!authed) return;
    if (HIDE.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return;
    if (!canPrompt()) return;
    const id = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(id);
  }, [authed, pathname]);

  if (!authed) return null;

  const choose = (desk: DiscoveryDeskPref) => {
    writeStored({ status: 'done', desk });
    setOpen(false);
    if (pathname.startsWith('/marketplace') || pathname.startsWith('/fr/marketplace')) {
      router.replace(desk === 'all' ? '/marketplace' : `/marketplace?desk=${desk}`);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        writeStored({ status: 'snoozed', until: Date.now() + 1000 * 60 * 60 * 24 * 7 });
        setOpen(false);
      }}
      title={t('discovery_prefs.title')}
      doneLabel={t('common.close')}
      maxHeightClass="max-h-[min(75dvh,440px)]"
    >
      <div className="px-4 pb-5 pt-1 space-y-3">
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">{t('discovery_prefs.body')}</p>
        {(
          [
            { desk: 'acca_desk' as const, label: t('marketplace.filter_acca_desk'), hint: t('discovery_prefs.hint_acca') },
            { desk: 'community' as const, label: t('marketplace.filter_community'), hint: t('discovery_prefs.hint_community') },
            { desk: 'all' as const, label: t('common.all'), hint: t('discovery_prefs.hint_all') },
          ]
        ).map((opt) => (
          <button
            key={opt.desk}
            type="button"
            onClick={() => choose(opt.desk)}
            className="touch-target w-full text-left rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 hover:border-[var(--primary)] transition-colors"
          >
            <p className="text-sm font-semibold text-[var(--text)]">{opt.label}</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{opt.hint}</p>
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            writeStored({ status: 'skipped' });
            setOpen(false);
          }}
          className="touch-target w-full py-2 text-xs font-medium text-[var(--text-muted)]"
        >
          {t('discovery_prefs.skip')}
        </button>
      </div>
    </BottomSheet>
  );
}
