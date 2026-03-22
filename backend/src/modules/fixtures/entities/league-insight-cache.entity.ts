import { Entity, PrimaryGeneratedColumn, Column, Index, Unique } from 'typeorm';

@Entity('league_insights_cache')
@Index('idx_league_insights_lookup', ['leagueApiId', 'season', 'kind'])
@Unique('uq_league_insights', ['leagueApiId', 'season', 'kind'])
export class LeagueInsightCache {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'league_api_id', type: 'int' })
  leagueApiId: number;

  @Column({ type: 'int' })
  season: number;

  /** 'standings' | 'topscorers' */
  @Column({ type: 'varchar', length: 20 })
  kind: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  payload: object;

  @Column({ name: 'fetched_at', type: 'timestamptz' })
  fetchedAt: Date;
}
