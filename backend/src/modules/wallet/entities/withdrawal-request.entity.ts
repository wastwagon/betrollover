import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('withdrawal_requests')
export class WithdrawalRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  payoutMethodId: number;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ length: 3, default: 'GHS' })
  currency: string;

  @Column({ length: 20, default: 'pending' })
  status: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null = null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  paystackTransferCode: string | null = null;

  @Column('text', { nullable: true })
  failureReason: string | null = null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
