import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type TelegramVipMembershipStatus = 'invited' | 'joined' | 'kicked' | 'expired';

@Entity('telegram_vip_memberships')
export class TelegramVipMembership {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  userId: number;

  @Column({ type: 'int', nullable: true })
  subscriptionId: number | null = null;

  @Column({ type: 'bigint', nullable: true })
  telegramUserId: string | null = null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  telegramUsername: string | null = null;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  linkToken: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  inviteLink: string | null = null;

  @Column({ type: 'varchar', length: 20, default: 'invited' })
  status: TelegramVipMembershipStatus;

  @Column({ type: 'timestamp', nullable: true })
  joinedAt: Date | null = null;

  @Column({ type: 'timestamp', nullable: true })
  kickedAt: Date | null = null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
