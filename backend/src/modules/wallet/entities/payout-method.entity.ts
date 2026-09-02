import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('payout_methods')
export class PayoutMethod {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ length: 20 })
  type: string; // mobile_money | bank | manual | crypto

  @Column({ length: 100 })
  recipientCode: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  country: string | null = null;

  @Column({ type: 'varchar', length: 3, nullable: true })
  currency: string | null = null;

  @Column({ type: 'text', nullable: true })
  /** JSON: { phone?, accountNumber?, bankName?, provider?, walletAddress?, cryptoCurrency?, network? } */
  manualDetails: string | null = null;

  @Column({ length: 100 })
  displayName: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  accountMasked: string | null = null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  bankCode: string | null = null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  provider: string | null = null;

  @Column({ default: true })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
