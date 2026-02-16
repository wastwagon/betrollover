import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('paystack_settings')
export class PaystackSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  secretKey: string | null = null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  publicKey: string | null = null;

  @Column({ type: 'varchar', length: 20, default: 'live' })
  mode: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
