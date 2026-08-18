import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('rollover_settings')
export class RolloverSettings {
  @PrimaryColumn({ type: 'int' })
  id: number = 1;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 20 })
  defaultCampaignStakeGhs: number;

  /** Ended campaigns before this time are omitted from public records. */
  @Column({ type: 'timestamptz', nullable: true })
  statsClearedAt: Date | null = null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
