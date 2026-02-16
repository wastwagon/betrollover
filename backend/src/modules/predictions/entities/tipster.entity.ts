import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tipsters')
export class Tipster {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  username: string;

  @Column({ length: 100 })
  displayName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatarUrl: string | null = null;

  @Column({ type: 'text', nullable: true })
  bio: string | null = null;

  @Column({ default: false })
  isAi: boolean;

  @Column({ type: 'varchar', length: 20, nullable: true })
  tipsterType: string | null = null;

  @Column({ type: 'jsonb', nullable: true })
  personalityProfile: Record<string, unknown> | null = null;

  @Column({ default: 0 })
  totalPredictions: number;

  @Column({ default: 0 })
  totalWins: number;

  @Column({ default: 0 })
  totalLosses: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  winRate: number;

  @Column('decimal', { precision: 8, scale: 2, default: 0 })
  roi: number;

  @Column({ default: 0 })
  currentStreak: number;

  @Column({ default: 0 })
  bestStreak: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  totalProfit: number;

  @Column('decimal', { precision: 6, scale: 2, default: 0 })
  avgOdds: number;

  @Column({ type: 'timestamp', nullable: true })
  lastPredictionDate: Date | null = null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  joinDate: Date;

  @Column({ default: true })
  isActive: boolean;

  /** Links to users table for marketplace display (AI tipsters get a user record) */
  @Column({ type: 'int', nullable: true })
  userId: number | null = null;

  @Column({ type: 'int', nullable: true })
  leaderboardRank: number | null = null;

  @Column('decimal', { precision: 8, scale: 2, default: 0 })
  monthlyRoi: number;

  @Column({ default: 0 })
  monthlyPredictions: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
