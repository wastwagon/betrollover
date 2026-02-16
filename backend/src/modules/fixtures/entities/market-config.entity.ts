import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('market_config')
export class MarketConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  marketName: string;

  @Column({ type: 'boolean', default: true })
  isEnabled: boolean = true;

  @Column({ type: 'int', default: 1 })
  tier: number = 1; // 1 = Tier 1 (core), 2 = Tier 2 (secondary)

  @Column({ type: 'jsonb', nullable: true })
  allowedValues: string[] | null = null; // For Over/Under lines, etc.

  @Column({ type: 'int', default: 0 })
  displayOrder: number = 0;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
