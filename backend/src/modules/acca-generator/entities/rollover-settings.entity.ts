import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('rollover_settings')
export class RolloverSettings {
  @PrimaryColumn({ type: 'int' })
  id: number = 1;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 20 })
  defaultCampaignStakeGhs: number;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
