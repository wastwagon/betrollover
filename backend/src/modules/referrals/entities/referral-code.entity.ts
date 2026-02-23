import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('referral_codes')
export class ReferralCode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 20, unique: true })
  code: string;

  @Column({ default: 0 })
  totalReferrals: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  totalCredited: number;

  @CreateDateColumn()
  createdAt: Date;
}
