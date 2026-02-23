import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AdZone } from './ad-zone.entity';

export type AdStatus = 'draft' | 'active' | 'paused' | 'ended';

@Entity('ad_campaigns')
export class AdCampaign {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  zoneId: number;

  @ManyToOne(() => AdZone, (z) => z.campaigns, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'zone_id' })
  zone: AdZone;

  @Column({ type: 'varchar', length: 255 })
  advertiserName: string;

  @Column({ type: 'varchar', length: 500 })
  imageUrl: string;

  @Column({ type: 'varchar', length: 500 })
  targetUrl: string;

  @Column('date')
  startDate: Date;

  @Column('date')
  endDate: Date;

  @Column({ default: 0 })
  impressions: number;

  @Column({ default: 0 })
  clicks: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  costPerClick: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  costPerMille: number;

  @Column({ length: 20, default: 'active' })
  status: AdStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
