'use client';

import { useT } from '@/context/LanguageContext';

export type VipPackageChannel = 'house' | 'tipster' | string;

export function VipPackageChannelBadge({ channel }: { channel?: VipPackageChannel | null }) {
  const t = useT();
  const isHouse = channel === 'house';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        isHouse
          ? 'bg-[var(--primary-light)] text-[var(--primary)]'
          : 'bg-[var(--bg-warm)] text-[var(--text-muted)] border border-[var(--border)]'
      }`}
    >
      {isHouse ? t('subscriptions.channel_house') : t('subscriptions.channel_tipster')}
    </span>
  );
}

export function VipPackageCadenceNote({
  channel,
  includedSlipsPerPeriod,
  durationDays,
  className,
}: {
  channel?: VipPackageChannel | null;
  includedSlipsPerPeriod?: number | null;
  durationDays?: number;
  className?: string;
}) {
  const t = useT();
  const text =
    channel === 'house'
      ? t('subscriptions.cadence_house')
      : t('subscriptions.cadence_tipster', {
          n: String(includedSlipsPerPeriod ?? 2),
          days: String(durationDays ?? 30),
        });
  return <p className={className}>{text}</p>;
}
