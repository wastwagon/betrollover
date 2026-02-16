import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('user_purchased_picks')
export class UserPurchasedPick {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  accumulatorId: number;

  @Column('decimal', { precision: 10, scale: 2 })
  purchasePrice: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  purchasedAt: Date;
}
