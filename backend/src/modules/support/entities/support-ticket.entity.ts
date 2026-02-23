import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('support_tickets')
export class SupportTicket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int', nullable: true })
  relatedCouponId: number | null = null;

  @Column({ length: 50, default: 'general' })
  category: string;

  @Column({ length: 255 })
  subject: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ length: 20, default: 'open' })
  status: string;

  @Column({ type: 'text', nullable: true })
  adminResponse: string | null = null;

  @Column({ type: 'int', nullable: true })
  resolvedBy: number | null = null;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null = null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
