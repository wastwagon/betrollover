import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TipsterSubscriptionPackage } from './tipster-subscription-package.entity';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  packageId: number;

  @ManyToOne(() => TipsterSubscriptionPackage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'package_id' })
  package: TipsterSubscriptionPackage;

  @Column()
  startedAt: Date;

  @Column()
  endsAt: Date;

  @Column('decimal', { precision: 10, scale: 2 })
  amountPaid: number;

  @Column({ length: 20, default: 'active' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
