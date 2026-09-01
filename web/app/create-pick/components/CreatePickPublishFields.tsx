'use client';

import Link from 'next/link';
import { AFRICAN_BOOKMAKERS } from '@betrollover/shared-types';
import { Button } from '@/components/ui/Button';
import { Input, Field, fieldControlClassName } from '@/components/ui/Input';
import { SellerPayoutSplitCallout } from '@/components/SellerPayoutSplitCallout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { isSubscriptionsEnabled } from '@/lib/subscriptions-enabled';
import type { SellingThresholds } from '@/lib/selling-thresholds';
import { useT } from '@/context/LanguageContext';

type Placement = 'marketplace' | 'subscription';

export function CreatePickPublishFields({
  idPrefix,
  variant = 'desktop',
  title,
  bookmakerKey,
  bookingCode,
  price,
  placement,
  subscriptionPackageIds,
  myPackages,
  sellTh,
  myTipStats,
  paidSaleAllowed,
  formError,
  createPickDisabled,
  submitting,
  onTitle,
  onBookmaker,
  onBookingCode,
  onPrice,
  onPlacement,
  onPackages,
  onClearError,
  onSubmit,
}: {
  idPrefix: string;
  variant?: 'desktop' | 'sheet';
  title: string;
  bookmakerKey: string;
  bookingCode: string;
  price: number;
  placement: Placement;
  subscriptionPackageIds: number[];
  myPackages: { id: number; name: string }[];
  sellTh: SellingThresholds | null;
  myTipStats: { roi: number; winRate: number } | null;
  paidSaleAllowed: boolean;
  formError: string | null;
  createPickDisabled: boolean;
  submitting: boolean;
  onTitle: (v: string) => void;
  onBookmaker: (v: string) => void;
  onBookingCode: (v: string) => void;
  onPrice: (v: number) => void;
  onPlacement: (v: Placement) => void;
  onPackages: (ids: number[]) => void;
  onClearError: () => void;
  onSubmit: () => void;
}) {
  const t = useT();
  const dense = variant === 'desktop';
  const rulesText = dense ? 'text-[10px]' : 'text-xs';
  const rulesPad = dense ? 'rounded-lg px-3 py-2' : 'rounded-xl px-3 py-2.5';
  const ready = Boolean(
    myTipStats && sellTh && myTipStats.roi >= sellTh.minimumROI && myTipStats.winRate >= sellTh.minimumWinRate,
  );

  return (
    <div className="space-y-3 pt-2 border-t border-[var(--separator)]">
      <Input
        id={`${idPrefix}-title`}
        label={`${t('create_pick.title_label')} *`}
        type="text"
        value={title}
        onChange={(e) => {
          onTitle(e.target.value);
          onClearError();
        }}
        placeholder="e.g. Saturday Banker"
      />
      <Field label={t('create_pick.bookie_label')} htmlFor={`${idPrefix}-bookie`}>
        <select
          id={`${idPrefix}-bookie`}
          value={bookmakerKey}
          onChange={(e) => {
            onBookmaker(e.target.value);
            onClearError();
          }}
          className={fieldControlClassName()}
        >
          <option value="">{t('create_pick.bookie_none')}</option>
          {AFRICAN_BOOKMAKERS.map((b) => (
            <option key={b.key} value={b.key}>
              {b.label}
            </option>
          ))}
        </select>
      </Field>
      <Input
        id={`${idPrefix}-booking`}
        label={t('create_pick.booking_code_label')}
        type="text"
        value={bookingCode}
        onChange={(e) => {
          onBookingCode(e.target.value);
          onClearError();
        }}
        placeholder={t('create_pick.booking_code_placeholder')}
        autoComplete="off"
        hint={t('create_pick.booking_code_hint_short')}
      />
      {sellTh && (placement === 'marketplace' || (placement === 'subscription' && price > 0)) && (
        <div className={`border border-[var(--accent)]/25 bg-[var(--accent-light)] space-y-1.5 ${rulesPad}`}>
          <p className={`${dense ? 'text-[11px]' : 'text-xs'} font-semibold text-[var(--text)]`}>
            {t('create_pick.paid_marketplace_rules_title')}
          </p>
          <p className={`${rulesText} text-[var(--text-muted)] leading-snug`}>
            {t('create_pick.paid_marketplace_rules_body', {
              minRoi: String(sellTh.minimumROI),
              minWr: String(sellTh.minimumWinRate),
            })}
          </p>
          {price > 0 && myTipStats && (
            <p
              className={`${rulesText} font-medium leading-snug ${
                ready ? 'text-[var(--success)]' : 'text-[var(--accent)]'
              }`}
            >
              {t('create_pick.paid_marketplace_your_stats', {
                roi: myTipStats.roi.toFixed(2),
                wr: String(myTipStats.winRate),
              })}{' '}
              {ready ? t('create_pick.paid_marketplace_ready') : t('create_pick.paid_marketplace_not_ready')}
            </p>
          )}
        </div>
      )}
      <Input
        id={`${idPrefix}-price`}
        label={`${t('create_pick.price_label')} ${t('create_pick.price_note')}`}
        type="number"
        min={0}
        value={price || ''}
        onChange={(e) => {
          onPrice(Number(e.target.value) || 0);
          onClearError();
        }}
        placeholder="0"
      />
      {Number(price) > 0 && sellTh && myTipStats && !paidSaleAllowed && (
        <p className={`${dense ? 'text-[11px]' : 'text-xs'} text-[var(--accent)] leading-snug`}>
          {t('create_pick.paid_price_blocked_hint')}
        </p>
      )}
      <SellerPayoutSplitCallout priceGhs={Number(price) || 0} compact={dense} className="mt-2" />
      {isSubscriptionsEnabled() ? (
        <div>
          <Field label="Placement" htmlFor={`${idPrefix}-placement`}>
            <select
              id={`${idPrefix}-placement`}
              value={placement}
              onChange={(e) => {
                const v = e.target.value as Placement;
                onPlacement(v);
                onClearError();
                if (v === 'marketplace') onPackages([]);
              }}
              className={fieldControlClassName()}
            >
              <option value="marketplace">Marketplace only</option>
              <option value="subscription">VIP / subscription only</option>
            </select>
          </Field>
          {placement === 'subscription' && myPackages.length > 0 && (
            <div className="mt-2 space-y-1">
              <span className={`${dense ? 'text-xs' : 'text-sm'} text-[var(--text-muted)]`}>
                {dense ? 'Add to packages:' : 'Add to package:'}
              </span>
              {myPackages.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center gap-2 cursor-pointer ${dense ? 'text-xs' : 'text-sm touch-target'}`}
                >
                  <input
                    type="checkbox"
                    checked={subscriptionPackageIds.includes(p.id)}
                    onChange={(e) => {
                      onClearError();
                      if (e.target.checked) onPackages([...subscriptionPackageIds, p.id]);
                      else onPackages(subscriptionPackageIds.filter((id) => id !== p.id));
                    }}
                    className={`${dense ? 'w-3.5 h-3.5' : 'w-4 h-4'} rounded border-[var(--border)]`}
                  />
                  <span>{p.name}</span>
                </label>
              ))}
            </div>
          )}
          {placement === 'subscription' && myPackages.length === 0 && (
            <p className={`${dense ? 'text-xs mt-1' : 'text-sm'} text-[var(--text-muted)]`}>
              <Link href="/dashboard/subscription-packages" className="text-[var(--primary)] hover:underline">
                {dense ? 'Create subscription packages' : 'Create a VIP package'}
              </Link>{' '}
              first.
            </p>
          )}
          {sellTh && placement === 'subscription' && price === 0 && (
            <p className={`${dense ? 'text-[10px] mt-2' : 'text-xs'} text-[var(--text-muted)] leading-snug`}>
              {t('create_pick.vip_same_bar', {
                minRoi: String(sellTh.minimumROI),
                minWr: String(sellTh.minimumWinRate),
              })}
            </p>
          )}
        </div>
      ) : null}
      {formError && (
        <div
          className={`border border-[var(--destructive)]/30 bg-[var(--destructive-light)] ${dense ? 'rounded-lg p-3' : 'rounded-xl p-3'}`}
        >
          <p className={`${dense ? 'text-[11px]' : 'text-xs'} font-semibold text-[var(--destructive)] mb-1`}>
            {t('create_pick.publish_error_title')}
          </p>
          <p className={`${dense ? 'text-[var(--text)] text-xs' : 'text-[var(--text)] text-sm'}`}>
            {formError}
          </p>
        </div>
      )}
      {createPickDisabled && !submitting && (
        <p className={`${dense ? 'text-[10px]' : 'text-xs'} text-[var(--text-muted)] leading-snug`}>
          {t('create_pick.desktop_create_hint')}
        </p>
      )}
      <Button
        type="button"
        onClick={onSubmit}
        disabled={createPickDisabled}
        fullWidth
        size="lg"
        leading={submitting ? <LoadingSpinner size="sm" /> : undefined}
      >
        {submitting ? t('create_pick.creating') : t('create_pick.create_btn')}
      </Button>
    </div>
  );
}
