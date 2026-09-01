'use client';

import { BottomSheet } from '@/components/ios/BottomSheet';
import { CreatePickListingPreview } from '@/components/CreatePickListingPreview';
import { useT } from '@/context/LanguageContext';
import type { SlipSelection } from '@/context/SlipCartContext';
import { CreatePickPublishFields } from './CreatePickPublishFields';
import { CreatePickSlipItems } from './CreatePickSlipItems';

type PublishProps = Omit<Parameters<typeof CreatePickPublishFields>[0], 'idPrefix' | 'variant'>;

export function CreatePickMobileSlipSheet({
  open,
  onClose,
  selections,
  totalOdds,
  onRemove,
  title,
  price,
  publish,
}: {
  open: boolean;
  onClose: () => void;
  selections: SlipSelection[];
  totalOdds: number;
  onRemove: (idx: number) => void;
  title: string;
  price: number;
  publish: PublishProps;
}) {
  const t = useT();
  return (
    <div className="lg:hidden">
      <BottomSheet
        open={open && selections.length > 0}
        onClose={onClose}
        title={t('create_pick.pick_slip')}
        doneLabel={t('common.close')}
        maxHeightClass="max-h-[min(92dvh,720px)]"
      >
        <div className="p-4 sm:p-5 space-y-4">
          <CreatePickSlipItems selections={selections} onRemove={onRemove} variant="sheet" />
          <div className="bg-[var(--primary-light)]/50 rounded-xl p-4 border border-[var(--primary)]/30 min-w-0">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span className="text-sm font-medium text-[var(--text-muted)] min-w-0">{t('create_pick.total_odds')}</span>
              <span className="text-xl font-bold text-[var(--primary)] tabular-nums shrink-0">{totalOdds.toFixed(2)}</span>
            </div>
          </div>
          <CreatePickListingPreview title={title} selections={selections} totalOdds={totalOdds} price={Number(price) || 0} />
          <CreatePickPublishFields idPrefix="create-pick-sheet" variant="sheet" {...publish} />
        </div>
      </BottomSheet>
    </div>
  );
}
