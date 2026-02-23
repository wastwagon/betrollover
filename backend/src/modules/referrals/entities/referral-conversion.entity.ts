import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ReferralCode } from './referral-code.entity';
import { User } from '../../users/entities/user.entity';

@Entity('referral_conversions')
export class ReferralConversion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  referralCodeId: number;

  @ManyToOne(() => ReferralCode, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referral_code_id' })
  referralCode: ReferralCode;

  @Column({ unique: true })
  referredUserId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referred_user_id' })
  referredUser: User;

  @Column('decimal', { precision: 10, scale: 2, default: 5.0 })
  rewardAmount: number;

  @Column({ default: false })
  rewardCredited: boolean;

  @Column({ type: 'timestamp', nullable: true })
  firstPurchaseAt: Date | null = null;

  @CreateDateColumn()
  createdAt: Date;
}
