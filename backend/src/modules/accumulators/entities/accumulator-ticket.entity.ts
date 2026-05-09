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

  @Column({ length: 30, default: 'active' })
  status: string;

  @Column({ length: 20, default: 'pending' })
  result: string;

  @Column({ default: false })
  isMarketplace: boolean;

  /** Allowlisted slug (e.g. sportybet) — see @betrollover/shared-types bookmakers-africa */
  @Column({ type: 'varchar', length: 64, nullable: true })
  bookmakerKey: string | null = null;

  /** Tipster-provided share / booking code for the selected bookmaker */
  @Column({ type: 'varchar', length: 128, nullable: true })
  bookingCode: string | null = null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => AccumulatorPick, (p) => p.accumulator)
  picks: AccumulatorPick[];
}
