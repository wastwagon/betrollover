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

  /** Platform commission % deducted from tipster payout on winning coupons (0–50). Default 30% per Terms. */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 30.0 })
  platformCommissionRate: number = 30.0;

  @Column({ type: 'int', name: 'stream_warn_active_connections', default: 120 })
  streamWarnActiveConnections: number = 120;

  @Column({ type: 'int', name: 'stream_critical_active_connections', default: 250 })
  streamCriticalActiveConnections: number = 250;

  @Column({ type: 'int', name: 'stream_warn_events_per_minute', default: 80 })
  streamWarnEventsPerMinute: number = 80;

  @Column({ type: 'int', name: 'stream_warn_avg_payload_bytes', default: 10_000 })
  streamWarnAvgPayloadBytes: number = 10_000;

  @Column({ type: 'int', name: 'stream_warn_stale_seconds', default: 90 })
  streamWarnStaleSeconds: number = 90;

  @Column({ type: 'int', name: 'stream_critical_stale_seconds', default: 180 })
  streamCriticalStaleSeconds: number = 180;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
