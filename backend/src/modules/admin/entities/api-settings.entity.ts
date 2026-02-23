import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('api_settings')
export class ApiSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  apiSportsKey: string | null = null;

  @Column({ type: 'int', default: 0 })
  dailyRequestsUsed: number = 0;

  @Column({ type: 'int', default: 0 })
  dailyRequestsLimit: number = 0;

  @Column({ type: 'timestamp', nullable: true })
  lastRequestDate: Date | null = null;

  @Column({ type: 'timestamp', nullable: true })
  lastTestDate: Date | null = null;

  @Column({ type: 'boolean', default: false })
  isActive: boolean = false;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 20.0 })
  minimumROI: number = 20.0;

  /** Platform commission % deducted from tipster payout on winning coupons (0–50). Default 10%. */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10.0 })
  platformCommissionRate: number = 10.0;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
