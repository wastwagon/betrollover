import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('pick_marketplace')
export class PickMarketplace {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  accumulatorId: number;

  @Column()
  sellerId: number;

  @Column('decimal', { precision: 8, scale: 2 })
  price: number;

  @Column({ length: 20, default: 'active' })
  status: string;

  @Column({ default: 0 })
  purchaseCount: number;

  @Column({ default: 0 })
  viewCount: number;

  @Column({ default: 1 })
  maxPurchases: number;

  /** Links to predictions table for admin price control (AI prediction coupons) */
  @Column({ type: 'int', nullable: true })
  predictionId: number | null = null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
