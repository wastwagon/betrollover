import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tipster } from './tipster.entity';

@Entity('tipster_performance_log')
export class TipsterPerformanceLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tipsterId: number;

  @ManyToOne(() => Tipster, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tipster_id' })
  tipster: Tipster;

  @Column({ type: 'date' })
  snapshotDate: Date;

  @Column({ type: 'int', nullable: true })
  totalPredictions: number | null = null;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  winRate: number | null = null;

  @Column('decimal', { precision: 8, scale: 2, nullable: true })
  roi: number | null = null;

  @Column({ type: 'int', nullable: true })
  currentStreak: number | null = null;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  totalProfit: number | null = null;

  @Column({ type: 'int', nullable: true })
  dailyRank: number | null = null;

  @Column({ type: 'int', nullable: true })
  weeklyRank: number | null = null;

  @Column({ type: 'int', nullable: true })
  monthlyRank: number | null = null;

  @CreateDateColumn()
  createdAt: Date;
}
