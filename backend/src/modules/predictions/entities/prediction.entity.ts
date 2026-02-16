import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Tipster } from './tipster.entity';
import { PredictionFixture } from './prediction-fixture.entity';

@Entity('predictions')
export class Prediction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tipsterId: number;

  @ManyToOne(() => Tipster, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tipster_id' })
  tipster: Tipster;

  @Column({ type: 'varchar', length: 200, nullable: true })
  predictionTitle: string | null = null;

  @Column('decimal', { precision: 8, scale: 2 })
  combinedOdds: number;

  @Column('decimal', { precision: 5, scale: 2, default: 1 })
  stakeUnits: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  confidenceLevel: string | null = null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  @Column({ type: 'varchar', length: 50, nullable: true, default: 'internal' })
  source: string | null = null;

  @Column({ type: 'date' })
  predictionDate: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  postedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  settledAt: Date | null = null;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  actualResult: number | null = null;

  @Column('decimal', { precision: 8, scale: 2, nullable: true })
  roiContribution: number | null = null;

  @Column({ default: 0 })
  views: number;

  @Column({ default: 0 })
  likes: number;

  @Column({ default: 0 })
  commentsCount: number;

  @Column({ default: 0 })
  followersWhoPlaced: number;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => PredictionFixture, (pf) => pf.prediction)
  fixtures: PredictionFixture[];
}
