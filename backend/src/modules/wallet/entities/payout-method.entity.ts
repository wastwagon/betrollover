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
  type: string; // mobile_money | bank

  @Column({ length: 100 })
  recipientCode: string;

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
