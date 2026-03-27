import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Subscription } from './subscription.entity';

@Entity('subscription_escrow')
export class SubscriptionEscrow {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  subscriptionId: number;

  @ManyToOne(() => Subscription, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscription_id' })
  subscription: Subscription;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ length: 20, default: 'held' })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  releasedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  refundReason: string | null;

  /** Platform commission % in effect when the subscriber paid (admin projection while held). */
  @Column('decimal', { name: 'commission_rate_percent_at_purchase', precision: 5, scale: 2, nullable: true })
  commissionRatePercentAtPurchase: number | null;

  /** Tipster wallet credit at period-end release (authoritative). */
  @Column('decimal', { name: 'released_tipster_net', precision: 10, scale: 2, nullable: true })
  releasedTipsterNet: number | null;

  @Column('decimal', { name: 'released_platform_fee', precision: 10, scale: 2, nullable: true })
  releasedPlatformFee: number | null;

  @Column('decimal', { name: 'released_commission_rate_percent', precision: 5, scale: 2, nullable: true })
  releasedCommissionRatePercent: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
