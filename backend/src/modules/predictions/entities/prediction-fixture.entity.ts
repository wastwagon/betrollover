import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Prediction } from './prediction.entity';
import { Fixture } from '../../fixtures/entities/fixture.entity';

@Entity('prediction_fixtures')
export class PredictionFixture {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  predictionId: number;

  @ManyToOne(() => Prediction, (p) => p.fixtures, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'prediction_id' })
  prediction: Prediction;

  @Column({ type: 'int', nullable: true })
  fixtureId: number | null = null;

  @Column({ type: 'int', nullable: true })
  eventId: number | null = null;

  @Column({ type: 'varchar', length: 30, default: 'football' })
  sport: string = 'football';

  @ManyToOne(() => Fixture, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'fixture_id' })
  fixture: Fixture | null = null;

  @Column({ type: 'timestamp' })
  matchDate: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  leagueName: string | null = null;

  @Column({ type: 'int', nullable: true })
  leagueId: number | null = null;

  @Column({ length: 100 })
  homeTeam: string;

  @Column({ length: 100 })
  awayTeam: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  selectedOutcome: string | null = null;

  @Column('decimal', { precision: 6, scale: 2 })
  selectionOdds: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  resultStatus: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  actualScore: string | null = null;

  @Column('decimal', { precision: 5, scale: 4, nullable: true })
  aiProbability: number | null = null;

  @Column('decimal', { precision: 6, scale: 4, nullable: true })
  expectedValue: number | null = null;

  @Column({ type: 'int', nullable: true })
  legNumber: number | null = null;

  @CreateDateColumn()
  createdAt: Date;
}
