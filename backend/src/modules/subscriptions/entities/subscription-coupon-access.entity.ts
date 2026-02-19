import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { TipsterSubscriptionPackage } from './tipster-subscription-package.entity';
import { AccumulatorTicket } from '../../accumulators/entities/accumulator-ticket.entity';

@Entity('subscription_coupon_access')
export class SubscriptionCouponAccess {
  @PrimaryColumn()
  subscriptionPackageId: number;

  @ManyToOne(() => TipsterSubscriptionPackage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscription_package_id' })
  subscriptionPackage: TipsterSubscriptionPackage;

  @PrimaryColumn()
  accumulatorId: number;

  @ManyToOne(() => AccumulatorTicket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'accumulator_id' })
  accumulator: AccumulatorTicket;
}
