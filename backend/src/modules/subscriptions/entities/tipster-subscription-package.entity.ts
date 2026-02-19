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

@Entity('tipster_subscription_packages')
export class TipsterSubscriptionPackage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tipsterUserId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tipster_user_id' })
  tipsterUser: User;

  @Column({ length: 100 })
  name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ default: 30 })
  durationDays: number;

  @Column('decimal', { precision: 6, scale: 2, nullable: true })
  roiGuaranteeMin: number | null;

  @Column({ default: false })
  roiGuaranteeEnabled: boolean;

  @Column({ length: 20, default: 'active' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
