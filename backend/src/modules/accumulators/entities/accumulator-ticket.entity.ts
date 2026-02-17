import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Unique } from 'typeorm';
import { AccumulatorPick } from './accumulator-pick.entity';

@Entity('accumulator_tickets')
@Unique(['userId', 'title'])
export class AccumulatorTicket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ length: 255 })
  title: string;

  @Column('text', { nullable: true })
  description: string | null = null;

  @Column({ length: 100, default: 'Football' })
  sport: string;

  @Column({ default: 1 })
  totalPicks: number;

  @Column('decimal', { precision: 10, scale: 3 })
  totalOdds: number;

  @Column('decimal', { precision: 8, scale: 2, default: 0 })
  price: number;

  @Column({ length: 30, default: 'pending_approval' })
  status: string;

  @Column({ length: 20, default: 'pending' })
  result: string;

  @Column({ default: false })
  isMarketplace: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => AccumulatorPick, (p) => p.accumulator)
  picks: AccumulatorPick[];
}
