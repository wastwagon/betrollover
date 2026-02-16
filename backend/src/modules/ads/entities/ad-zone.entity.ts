import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { AdCampaign } from './ad-campaign.entity';

@Entity('ad_zones')
export class AdZone {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  slug: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null = null;

  @Column({ type: 'int', default: 300 })
  width: number;

  @Column({ type: 'int', default: 250 })
  height: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => AdCampaign, (c) => c.zone)
  campaigns: AdCampaign[];
}
