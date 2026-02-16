import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('enabled_leagues')
export class EnabledLeague {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  apiId: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  country: string | null = null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logo: string | null = null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean = true;

  @Column({ type: 'int', default: 0 })
  priority: number = 0;

  /** domestic | cup | international | women | youth - for filtering and UI */
  @Column({ type: 'varchar', length: 20, nullable: true })
  category: string | null = null;

  /** league | cup - from API-Football type */
  @Column({ type: 'varchar', length: 10, nullable: true, name: 'api_type' })
  apiType: string | null = null;

  /** core | extended | niche - bookmaker support tier for "Popular with bookmakers" */
  @Column({ type: 'varchar', length: 20, nullable: true, name: 'bookmaker_tier' })
  bookmakerTier: string | null = null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
