import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Fixture } from './fixture.entity';

@Entity('fixture_odds')
export class FixtureOdd {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  fixtureId: number;

  @ManyToOne(() => Fixture, (f) => f.odds, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fixture_id' })
  fixture: Fixture;

  @Column({ type: 'varchar', length: 100 })
  marketName: string;

  @Column({ type: 'varchar', length: 100 })
  marketValue: string;

  @Column('decimal', { precision: 10, scale: 3 })
  odds: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  bookmaker: string | null = null;

  @Column({ type: 'timestamp', nullable: true })
  syncedAt: Date | null = null;
}
