'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/context/LanguageContext';
import {
  deleteMarketplaceSavedFilter,
  listMarketplaceSavedFilters,
  saveMarketplaceFilter,
  type MarketplaceSavedFilter,
} from '@/lib/marketplace-saved-filters';

type MarketplaceSavedFiltersBarProps = {
  current: Omit<MarketplaceSavedFilter, 'id' | 'createdAt' | 'name'>;
  hasActiveFilters: boolean;
  onApply: (filter: MarketplaceSavedFilter) => void;
};

export function MarketplaceSavedFiltersBar({
  current,
  hasActiveFilters,
  onApply,
}: MarketplaceSavedFiltersBarProps) {
  const t = useT();
  const [saved, setSaved] = useState<MarketplaceSavedFilter[]>([]);

  useEffect(() => {
    setSaved(listMarketplaceSavedFilters());
  }, []);

  const handleSave = () => {
    const name = window.prompt(t('marketplace.saved_filters_prompt'));
    if (!name?.trim()) return;
    setSaved(saveMarketplaceFilter({ ...current, name: name.trim() }));
  };

  if (!hasActiveFilters && saved.length === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 min-w-0">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] shrink-0">
        {t('marketplace.saved_filters')}
      </span>
      {saved.map((f) => (
        <span
          key={f.id}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--card)] pl-2.5 pr-1 py-1 text-xs text-[var(--text)]"
        >
          <button
            type="button"
            onClick={() => onApply(f)}
            className="font-medium hover:text-[var(--primary)] touch-target max-w-[9rem] truncate"
            title={f.name}
          >
            {f.name}
          </button>
          <button
            type="button"
            onClick={() => setSaved(deleteMarketplaceSavedFilter(f.id))}
            className="touch-target rounded-full px-1.5 text-[var(--text-muted)] hover:text-red-600"
            aria-label={t('marketplace.saved_filters_delete')}
          >
            ×
          </button>
        </span>
      ))}
      {hasActiveFilters ? (
        <button
          type="button"
          onClick={handleSave}
          className="touch-target rounded-full border border-dashed border-[var(--primary)]/50 px-3 py-1 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--primary)]/10"
        >
          {t('marketplace.saved_filters_save')}
        </button>
      ) : null}
    </div>
  );
}
