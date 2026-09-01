'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BottomSheet } from '@/components/ios/BottomSheet';
import { useT } from '@/context/LanguageContext';
import { hapticLight } from '@/lib/haptic';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

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
        <Input
          id="global-search-query"
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
          className="min-h-[48px] px-4 py-3 text-base"
          aria-label={t('common.search')}
        />

        <div className="grid grid-cols-1 gap-2">
          <Button
            type="button"
            disabled={!trimmed}
            onClick={() => go(`/tipsters?search=${encodeURIComponent(trimmed)}`)}
            fullWidth
          >
            {t('nav.tipsters')}
            {trimmed ? `: “${trimmed}”` : ''}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!trimmed}
            onClick={() => go(`/marketplace?tipster=${encodeURIComponent(trimmed)}`)}
            fullWidth
          >
            {t('nav.picks')}
            {trimmed ? `: “${trimmed}”` : ''}
          </Button>
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
