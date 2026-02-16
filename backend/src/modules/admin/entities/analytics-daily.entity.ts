import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('analytics_daily')
export class AnalyticsDaily {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date', unique: true })
  date: string;

  @Column({ default: 0 })
  uniqueVisitors: number;

  @Column({ default: 0 })
  uniqueSessions: number;

  @Column({ default: 0 })
  pageViews: number;

  @Column({ default: 0 })
  registeredUsers: number;

  @Column({ default: 0 })
  contentCreators: number;

  @Column({ default: 0 })
  marketplaceSellers: number;

  @Column({ default: 0 })
  buyers: number;

  @Column({ default: 0 })
  picksCreated: number;

  @Column({ default: 0 })
  listingsAdded: number;

  @Column({ default: 0 })
  purchases: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  revenue: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
