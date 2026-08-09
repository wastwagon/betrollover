'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BottomSheet } from '@/components/ios/BottomSheet';
import { useT } from '@/context/LanguageContext';
import { hapticLight } from '@/lib/haptic';

type GlobalSearchSheetProps = {
  open: boolean;
  onClose: () => void;
};

/** Unified tipster + marketplace pick search entry. */
export function GlobalSearchSheet({ open, onClose }: GlobalSearchSheetProps) {
  const t = useT();
  const router = useRouter();
  const [q, setQ] = useState('');

  const go = (path: string) => {
    hapticLight();
    onClose();
    router.push(path);
    setQ('');
  };

  const trimmed = q.trim();

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        onClose();
        setQ('');
      }}
      title={t('common.search')}
      doneLabel={t('common.close')}
    >
      <div className="p-4 space-y-4">
        <label className="block min-w-0">
          <span className="sr-only">{t('common.search')}</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && trimmed) {
                go(`/tipsters?search=${encodeURIComponent(trimmed)}`);
              }
            }}
            autoFocus
            placeholder={t('marketplace.tipster_search_placeholder')}
            className="w-full min-h-[48px] px-4 py-3 text-base rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          />
        </label>

        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            disabled={!trimmed}
            onClick={() => go(`/tipsters?search=${encodeURIComponent(trimmed)}`)}
            className="touch-target w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {t('nav.tipsters')}
            {trimmed ? `: “${trimmed}”` : ''}
          </button>
          <button
            type="button"
            disabled={!trimmed}
            onClick={() => go(`/marketplace?tipster=${encodeURIComponent(trimmed)}`)}
            className="touch-target w-full rounded-xl border border-[var(--separator)] bg-[var(--card)] px-4 py-3 text-sm font-semibold text-[var(--text)] disabled:opacity-40"
          >
            {t('nav.picks')}
            {trimmed ? `: “${trimmed}”` : ''}
          </button>
          <button
            type="button"
            onClick={() => go('/leaderboard')}
            className="touch-target w-full rounded-xl px-4 py-3 text-sm font-medium text-[var(--primary)]"
          >
            {t('nav.leaderboard')} →
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
