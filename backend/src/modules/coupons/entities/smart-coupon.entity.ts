import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export interface SmartCouponFixture {
  fixtureId: number;
  apiId: number;
  home: string;
  away: string;
  league: string;
  market: string;
  tip: string;
  confidence: number;
  odds: number;
  status?: string;
  matchStatus?: string;
  matchDate?: Date;
  homeScore?: number | null;
  awayScore?: number | null;
}

@Entity('smart_coupons')
export class SmartCoupon {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: string;

  @Column('decimal', { precision: 8, scale: 3 })
  totalOdds: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'won' | 'lost';

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  profit: number;

  @Column('jsonb', { default: [] })
  fixtures: SmartCouponFixture[];

  @CreateDateColumn()
  createdAt: Date;
}
