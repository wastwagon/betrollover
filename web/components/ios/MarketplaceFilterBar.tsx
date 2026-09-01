'use client';

import { useState } from 'react';
import { SegmentedControl } from './SegmentedControl';
import { BottomSheet } from './BottomSheet';
import { Input, fieldControlClassName } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export type MarketplacePriceFilter = 'all' | 'free' | 'paid';
export type MarketplaceDayFilter = 'all' | 'today' | 'tomorrow';
export type MarketplaceSourceFilter = 'all' | 'acca_desk' | 'community';
export type MarketplaceSortBy =
  | 'newest'
  | 'price-low'
  | 'price-high'
  | 'tipster-rank'
  | 'following-only'
  | 'relevance';

export type MarketplaceFilterCounts = {
  day: { all: number; today: number; tomorrow: number };
  price: { all: number; free: number; paid: number };
  source?: { all: number; acca_desk: number; community: number };
};

export interface MarketplaceFilterBarProps {
  priceFilter: MarketplacePriceFilter;
  onPriceFilterChange: (v: MarketplacePriceFilter) => void;
  dayFilter: MarketplaceDayFilter;
  onDayFilterChange: (v: MarketplaceDayFilter) => void;
  sourceFilter: MarketplaceSourceFilter;
  onSourceFilterChange: (v: MarketplaceSourceFilter) => void;
  sortBy: MarketplaceSortBy;
  onSortByChange: (v: MarketplaceSortBy) => void;
  tipsterSearch: string;
  onTipsterSearchChange: (v: string) => void;
  debouncedTipster: string;
  showFollowingSort: boolean;
  counts?: MarketplaceFilterCounts;
  labels: {
    filterPrice: string;
    filterDay: string;
    filterSource: string;
    sourceDesk: string;
    sourceTipsters: string;
    all: string;
    free: string;
    paid: string;
    dayToday: string;
    dayTomorrow: string;
    sortBy: string;
    sortNewest: string;
    sortRelevance: string;
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
  dayFilter,
  onDayFilterChange,
  sourceFilter,
  onSourceFilterChange,
  sortBy,
  onSortByChange,
  tipsterSearch,
  onTipsterSearchChange,
  debouncedTipster,
  showFollowingSort,
  counts,
  labels,
  onClear,
  hasActiveFilters,
}: MarketplaceFilterBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const sortOptions: { value: MarketplaceSortBy; label: string }[] = [
    { value: 'relevance', label: labels.sortRelevance },
    { value: 'newest', label: labels.sortNewest },
    ...(showFollowingSort ? [{ value: 'following-only' as const, label: labels.sortFollowing }] : []),
    { value: 'price-low', label: labels.sortPriceAsc },
    { value: 'price-high', label: labels.sortPriceDesc },
    { value: 'tipster-rank', label: labels.sortRank },
  ];

  const dayCounts = counts?.day;
  const priceCounts = counts?.price;
  const sourceCounts = counts?.source;
  const sheetHasExtras =
    sortBy !== 'newest' ||
    !!debouncedTipster ||
    dayFilter !== 'all' ||
    priceFilter !== 'all' ||
    sourceFilter !== 'all';

  return (
    <div className="mb-3 min-w-0 max-w-full space-y-2.5">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] px-0.5">
          {labels.filterSource}
        </p>
        <SegmentedControl
          aria-label={labels.filterSource}
          className="w-full max-w-lg"
          options={[
            { value: 'all' as const, label: labels.all, count: sourceCounts?.all },
            { value: 'community' as const, label: labels.sourceTipsters, count: sourceCounts?.community },
            { value: 'acca_desk' as const, label: labels.sourceDesk, count: sourceCounts?.acca_desk },
          ]}
          value={sourceFilter}
          onChange={onSourceFilterChange}
        />
      </div>

      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] px-0.5">
          {labels.filterDay}
        </p>
        <SegmentedControl
          aria-label={labels.filterDay}
          className="w-full max-w-lg"
          options={[
            { value: 'all' as const, label: labels.all, count: dayCounts?.all },
            { value: 'today' as const, label: labels.dayToday, count: dayCounts?.today },
            { value: 'tomorrow' as const, label: labels.dayTomorrow, count: dayCounts?.tomorrow },
          ]}
          value={dayFilter}
          onChange={onDayFilterChange}
        />
      </div>

      <div className="hidden sm:block space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] px-0.5">
          {labels.filterPrice}
        </p>
        <SegmentedControl
          aria-label={labels.filterPrice}
          className="w-full max-w-md"
          options={[
            { value: 'all' as const, label: labels.all, count: priceCounts?.all },
            { value: 'free' as const, label: labels.free, count: priceCounts?.free },
            { value: 'paid' as const, label: labels.paid, count: priceCounts?.paid },
          ]}
          value={priceFilter}
          onChange={onPriceFilterChange}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:hidden">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setSheetOpen(true)}
        >
          {labels.moreFilters}
          {sheetHasExtras && (
            <span className="ml-1.5 text-[var(--primary)]" aria-hidden>
              •
            </span>
          )}
        </Button>
        {hasActiveFilters ? (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            {labels.clearFilters}
          </Button>
        ) : null}
      </div>

      <div className="hidden sm:flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 flex-1 min-w-0 w-full sm:min-w-[200px] sm:max-w-md">
          <label htmlFor="marketplace-tipster-search" className="text-sm font-medium text-[var(--text)] shrink-0">
            {labels.tipsterSearch}
          </label>
          <div className="relative flex-1 min-w-0">
            <Input
              id="marketplace-tipster-search"
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              placeholder={labels.tipsterPlaceholder}
              value={tipsterSearch}
              onChange={(e) => onTipsterSearchChange(e.target.value)}
              className="pr-24"
            />
            {tipsterSearch.trim() !== debouncedTipster ? (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[var(--text-muted)] pointer-events-none">
                {labels.tipsterSearching}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 w-full sm:w-auto min-w-0">
          <label htmlFor="marketplace-sort-by" className="text-sm font-medium text-[var(--text)] shrink-0">{labels.sortBy}</label>
          <select
            id="marketplace-sort-by"
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as MarketplaceSortBy)}
            className={fieldControlClassName(undefined, 'w-full sm:w-auto sm:min-w-[140px] py-1.5 font-medium')}
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {hasActiveFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="shrink-0"
          >
            {labels.clearFilters}
          </Button>
        ) : null}
      </div>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={labels.moreFilters} doneLabel={labels.done}>
        <div className="px-4 py-4 space-y-5">
          <Input
            id="marketplace-tipster-search-mobile"
            label={labels.tipsterSearch}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            placeholder={labels.tipsterPlaceholder}
            value={tipsterSearch}
            onChange={(e) => onTipsterSearchChange(e.target.value)}
            className="text-base py-3"
          />
          <div>
            <p className="text-sm font-medium text-[var(--text)] mb-2">{labels.filterPrice}</p>
            <SegmentedControl
              aria-label={labels.filterPrice}
              className="w-full max-w-none"
              options={[
                { value: 'all' as const, label: labels.all, count: priceCounts?.all },
                { value: 'free' as const, label: labels.free, count: priceCounts?.free },
                { value: 'paid' as const, label: labels.paid, count: priceCounts?.paid },
              ]}
              value={priceFilter}
              onChange={onPriceFilterChange}
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
