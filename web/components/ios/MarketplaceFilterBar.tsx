'use client';

import { useState } from 'react';
import { SegmentedControl } from './SegmentedControl';
import { BottomSheet } from './BottomSheet';

export type MarketplacePriceFilter = 'all' | 'free' | 'paid' | 'sold';
export type MarketplaceSortBy =
  | 'newest'
  | 'price-low'
  | 'price-high'
  | 'tipster-rank'
  | 'following-only';

export interface MarketplaceFilterBarProps {
  priceFilter: MarketplacePriceFilter;
  onPriceFilterChange: (v: MarketplacePriceFilter) => void;
  sortBy: MarketplaceSortBy;
  onSortByChange: (v: MarketplaceSortBy) => void;
  tipsterSearch: string;
  onTipsterSearchChange: (v: string) => void;
  debouncedTipster: string;
  showFollowingSort: boolean;
  labels: {
    filterPrice: string;
    sortBy: string;
    all: string;
    free: string;
    paid: string;
    sold: string;
    sortNewest: string;
    sortFollowing: string;
    sortPriceAsc: string;
    sortPriceDesc: string;
    sortRank: string;
    tipsterSearch: string;
    tipsterPlaceholder: string;
    tipsterSearching: string;
    moreFilters: string;
    clearFilters: string;
    done: string;
  };
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function MarketplaceFilterBar({
  priceFilter,
  onPriceFilterChange,
  sortBy,
  onSortByChange,
  tipsterSearch,
  onTipsterSearchChange,
  debouncedTipster,
  showFollowingSort,
  labels,
  onClear,
  hasActiveFilters,
}: MarketplaceFilterBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const sortOptions: { value: MarketplaceSortBy; label: string }[] = [
    { value: 'newest', label: labels.sortNewest },
    ...(showFollowingSort ? [{ value: 'following-only' as const, label: labels.sortFollowing }] : []),
    { value: 'price-low', label: labels.sortPriceAsc },
    { value: 'price-high', label: labels.sortPriceDesc },
    { value: 'tipster-rank', label: labels.sortRank },
  ];

  return (
    <div className="mb-4 min-w-0 max-w-full space-y-3">
      <SegmentedControl
        aria-label={labels.filterPrice}
        className="w-full max-w-lg"
        options={[
          { value: 'all' as const, label: labels.all },
          { value: 'free' as const, label: labels.free },
          { value: 'paid' as const, label: labels.paid },
          { value: 'sold' as const, label: labels.sold },
        ]}
        value={priceFilter}
        onChange={onPriceFilterChange}
      />

      <div className="flex flex-wrap items-center gap-2 sm:hidden">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="touch-target px-4 py-2 rounded-lg text-sm font-medium bg-[var(--card)] border border-[var(--separator)] text-[var(--text)]"
        >
          {labels.moreFilters}
          {(sortBy !== 'newest' || debouncedTipster) && (
            <span className="ml-1.5 text-[var(--primary)]" aria-hidden>
              •
            </span>
          )}
        </button>
        {hasActiveFilters ? (
          <button type="button" onClick={onClear} className="touch-target px-3 py-2 text-sm font-medium text-[var(--primary)]">
            {labels.clearFilters}
          </button>
        ) : null}
      </div>

      <div className="hidden sm:flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 flex-1 min-w-0 w-full sm:min-w-[200px] sm:max-w-md">
          <label htmlFor="marketplace-tipster-search" className="text-sm font-medium text-[var(--text)] shrink-0">
            {labels.tipsterSearch}
          </label>
          <div className="relative flex-1 min-w-0">
            <input
              id="marketplace-tipster-search"
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              placeholder={labels.tipsterPlaceholder}
              value={tipsterSearch}
              onChange={(e) => onTipsterSearchChange(e.target.value)}
              className="w-full px-3 py-2 pr-24 rounded-lg border border-[var(--separator)] bg-[var(--card)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
            {tipsterSearch.trim() !== debouncedTipster ? (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[var(--text-muted)] pointer-events-none">
                {labels.tipsterSearching}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 w-full sm:w-auto min-w-0">
          <label className="text-sm font-medium text-[var(--text)] shrink-0">{labels.sortBy}</label>
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as MarketplaceSortBy)}
            className="w-full sm:w-auto sm:min-w-[140px] px-3 py-1.5 rounded-lg border border-[var(--separator)] bg-[var(--card)] text-[var(--text)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={labels.moreFilters} doneLabel={labels.done}>
        <div className="px-4 py-4 space-y-5">
          <div>
            <label htmlFor="marketplace-tipster-search-mobile" className="block text-sm font-medium text-[var(--text)] mb-1.5">
              {labels.tipsterSearch}
            </label>
            <input
              id="marketplace-tipster-search-mobile"
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              placeholder={labels.tipsterPlaceholder}
              value={tipsterSearch}
              onChange={(e) => onTipsterSearchChange(e.target.value)}
              className="w-full px-3 py-3 rounded-xl border border-[var(--separator)] bg-[var(--bg)] text-[var(--text)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text)] mb-2">{labels.sortBy}</p>
            <div className="ios-grouped-section mx-0">
              {sortOptions.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => onSortByChange(o.value)}
                  className={`ios-list-row w-full flex items-center justify-between px-4 py-3 min-h-[44px] border-b border-[var(--separator)] last:border-b-0 text-left text-[15px] touch-manipulation ${
                    sortBy === o.value ? 'text-[var(--primary)] font-medium bg-[var(--primary-light)]/30' : 'text-[var(--text)]'
                  }`}
                >
                  {o.label}
                  {sortBy === o.value ? <span aria-hidden>✓</span> : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
