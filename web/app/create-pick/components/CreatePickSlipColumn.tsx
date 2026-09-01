'use client';

import { CreatePickListingPreview } from '@/components/CreatePickListingPreview';
import { useT } from '@/context/LanguageContext';
import type { SlipSelection } from '@/context/SlipCartContext';
import { CreatePickPublishFields } from './CreatePickPublishFields';
import { CreatePickSlipItems } from './CreatePickSlipItems';

type PublishProps = Omit<Parameters<typeof CreatePickPublishFields>[0], 'idPrefix' | 'variant'>;

export function CreatePickSlipColumn({
  selections,
  totalOdds,
  onRemove,
  title,
  price,
  publish,
}: {
  selections: SlipSelection[];
  totalOdds: number;
  onRemove: (idx: number) => void;
  title: string;
  price: number;
  publish: PublishProps;
}) {
  const t = useT();
  return (
    <div
      id="create-pick-publish"
      className="hidden lg:block lg:w-96 lg:shrink-0 min-w-0 scroll-mt-[calc(var(--br-chrome-below-header)+3.5rem)]"
    >
      <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)] mb-3 px-0.5">
        3 · Publish
      </p>
      <div className="lg:sticky lg:top-4 min-w-0">
        <div className="rounded-[var(--radius)] border border-[var(--separator)] bg-[var(--card)] shadow-card p-5 space-y-4 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-4 min-w-0">
            <h2 className="font-display text-lg font-semibold text-[var(--text)] min-w-0 flex-1 truncate">
              {t('create_pick.pick_slip')}
            </h2>
            {selections.length > 0 ? (
              <span className="shrink-0 px-2.5 py-1 bg-[var(--primary)] text-white rounded-full text-xs font-semibold">
                {selections.length}
              </span>
            ) : null}
          </div>

          {selections.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-[var(--text-muted)]">{t('create_pick.slip_empty')}</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">{t('create_pick.tap_to_add')}</p>
            </div>
          ) : (
            <>
              <CreatePickSlipItems selections={selections} onRemove={onRemove} variant="desktop" />
              <div className="bg-[var(--card)] rounded-lg p-4 border-2 border-[var(--primary)]/50">
                <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
                  <span className="text-sm font-medium text-[var(--text-muted)] min-w-0">{t('create_pick.total_odds')}</span>
                  <span className="text-xl font-bold text-[var(--primary)] tabular-nums shrink-0">{totalOdds.toFixed(2)}</span>
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  {selections.length} {selections.length !== 1 ? t('create_pick.selections') : t('create_pick.selection')}
                </div>
              </div>
              <CreatePickListingPreview title={title} selections={selections} totalOdds={totalOdds} price={Number(price) || 0} />
              <CreatePickPublishFields idPrefix="create-pick" variant="desktop" {...publish} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
