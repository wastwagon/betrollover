import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('analytics_events')
export class AnalyticsEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64 })
  @Index()
  sessionId: string;

  @Column({ type: 'int', nullable: true })
  @Index()
  userId: number | null = null;

  @Column({ type: 'varchar', length: 64 })
  @Index()
  eventType: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  page: string | null = null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null = null;

  @CreateDateColumn()
  createdAt: Date;
}
