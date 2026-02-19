import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('in_app_purchases')
export class InAppPurchase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 10 })
  platform: string;

  @Column({ length: 100 })
  productId: string;

  @Column({ length: 200 })
  transactionId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ length: 20, default: 'completed' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}
