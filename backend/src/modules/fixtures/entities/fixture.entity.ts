import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { League } from './league.entity';
import { FixtureOdd } from './fixture-odd.entity';

@Entity('fixtures')
export class Fixture {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  apiId: number;

  @Column({ type: 'int', nullable: true })
  leagueId: number | null = null;

  @ManyToOne(() => League, { nullable: true })
  @JoinColumn({ name: 'league_id' })
  league: League | null = null;

  @Column({ length: 150 })
  homeTeamName: string;

  @Column({ length: 150 })
  awayTeamName: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  homeTeamLogo: string | null = null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  awayTeamLogo: string | null = null;

  /** ISO 2-letter or FIFA 3-letter country code for internationals (e.g. ENG, GB, DE) */
  @Column({ type: 'varchar', length: 10, nullable: true })
  homeCountryCode: string | null = null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  awayCountryCode: string | null = null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  leagueName: string | null = null;

  @Column({ type: 'timestamp' })
  matchDate: Date;

  @Column({ length: 20, default: 'NS' })
  status: string;

  @Column({ type: 'int', nullable: true })
  homeScore: number | null = null;

  @Column({ type: 'int', nullable: true })
  awayScore: number | null = null;

  @Column({ type: 'timestamp', nullable: true })
  syncedAt: Date | null = null;

  @OneToMany(() => FixtureOdd, (o) => o.fixture)
  odds: FixtureOdd[];
}
