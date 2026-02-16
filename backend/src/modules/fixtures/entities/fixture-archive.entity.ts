import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/**
 * Archived fixture rows (match_date older than 90 days and not referenced by any pick).
 * Keeps the main fixtures table lean while preserving history in archive.
 */
@Entity('fixtures_archive')
export class FixtureArchive {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'original_id' })
  originalId: number;

  @Column({ type: 'int', name: 'api_id' })
  apiId: number;

  @Column({ type: 'int', name: 'league_id', nullable: true })
  leagueId: number | null = null;

  @Column({ type: 'varchar', length: 150, name: 'home_team_name' })
  homeTeamName: string;

  @Column({ type: 'varchar', length: 150, name: 'away_team_name' })
  awayTeamName: string;

  @Column({ type: 'varchar', length: 100, name: 'league_name', nullable: true })
  leagueName: string | null = null;

  @Column({ type: 'timestamp', name: 'match_date' })
  matchDate: Date;

  @Column({ type: 'varchar', length: 20, default: 'NS' })
  status: string;

  @Column({ type: 'int', name: 'home_score', nullable: true })
  homeScore: number | null = null;

  @Column({ type: 'int', name: 'away_score', nullable: true })
  awayScore: number | null = null;

  @Column({ type: 'timestamp', name: 'synced_at', nullable: true })
  syncedAt: Date | null = null;

  @Column({ type: 'timestamp', name: 'archived_at', default: () => 'CURRENT_TIMESTAMP' })
  archivedAt: Date;
}
