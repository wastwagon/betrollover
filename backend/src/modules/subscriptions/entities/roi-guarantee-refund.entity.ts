import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Subscription } from './subscription.entity';
import { User } from '../../users/entities/user.entity';

@Entity('roi_guarantee_refunds')
export class RoiGuaranteeRefund {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  subscriptionId: number;

  @ManyToOne(() => Subscription)
  @JoinColumn({ name: 'subscription_id' })
  subscription: Subscription;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('decimal', { precision: 6, scale: 2, nullable: true })
  roiAchieved: number | null;

  @Column('decimal', { precision: 6, scale: 2, nullable: true })
  roiThreshold: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
