import { VIP_TIPSTER_TYPE } from '../../config/vip-tipster.config';

/** Human VIP plans include this many subscription-placement slips per package duration. */
export const HUMAN_VIP_INCLUDED_SLIPS_PER_PERIOD = 2;

export type VipDeliveryChannel = 'house' | 'tipster';
export type VipDeliverySurface = 'telegram' | 'in_app';

export function vipChannelFromTipsterType(tipsterType?: string | null): VipDeliveryChannel {
  return (tipsterType || '').toLowerCase() === VIP_TIPSTER_TYPE ? 'house' : 'tipster';
}

export function vipPackageDeliveryMeta(tipsterType?: string | null): {
  channel: VipDeliveryChannel;
  delivery: VipDeliverySurface;
  includedSlipsPerPeriod: number | null;
} {
  const channel = vipChannelFromTipsterType(tipsterType);
  if (channel === 'house') {
    return { channel, delivery: 'telegram', includedSlipsPerPeriod: null };
  }
  return {
    channel,
    delivery: 'in_app',
    includedSlipsPerPeriod: HUMAN_VIP_INCLUDED_SLIPS_PER_PERIOD,
  };
}
