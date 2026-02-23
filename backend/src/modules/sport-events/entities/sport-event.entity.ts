import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  Unique,
} from 'typeorm';
import { SportEventOdd } from './sport-event-odd.entity';

export type SportType = 'football' | 'basketball' | 'rugby' | 'mma' | 'volleyball' | 'hockey';

@Entity('sport_events')
@Unique(['sport', 'apiId'])
@Index(['sport'])
@Index(['eventDate'])
@Index(['status'])
export class SportEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 30 })
  sport: string;

  @Column({ type: 'bigint' })
  apiId: number;

  @Column({ type: 'int', nullable: true })
  leagueId: number | null = null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  leagueName: string | null = null;

  @Column({ type: 'varchar', length: 200 })
  homeTeam: string;

  @Column({ type: 'varchar', length: 200 })
  awayTeam: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  homeTeamLogo: string | null = null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  awayTeamLogo: string | null = null;

  /** ISO 2-letter or FIFA 3-letter country code for internationals */
  @Column({ type: 'varchar', length: 10, nullable: true })
  homeCountryCode: string | null = null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  awayCountryCode: string | null = null;

  @Column({ type: 'timestamp' })
  eventDate: Date;

  @Column({ type: 'varchar', length: 20, default: 'NS' })
  status: string;

  @Column({ type: 'int', nullable: true })
  homeScore: number | null = null;

  @Column({ type: 'int', nullable: true })
  awayScore: number | null = null;

  @Column({ type: 'jsonb', nullable: true })
  rawJson: Record<string, unknown> | null = null;

  @Column({ type: 'timestamp', nullable: true })
  syncedAt: Date | null = null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => SportEventOdd, (o) => o.sportEvent)
  odds: SportEventOdd[];
}
