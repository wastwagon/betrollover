import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity('escrow_funds')
@Unique(['userId', 'pickId'])
export class EscrowFund {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  pickId: number;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ length: 100 })
  reference: string;

  @Column({ length: 20, default: 'held' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
