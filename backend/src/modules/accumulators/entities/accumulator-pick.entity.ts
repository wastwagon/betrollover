import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { AccumulatorTicket } from './accumulator-ticket.entity';

@Entity('accumulator_picks')
export class AccumulatorPick {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  accumulatorId: number;

  @ManyToOne(() => AccumulatorTicket, (t) => t.picks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'accumulator_id' })
  accumulator: AccumulatorTicket;

  @Column({ type: 'int', nullable: true })
  fixtureId: number | null = null;

  @Column({ length: 255 })
  matchDescription: string;

  @Column({ length: 100 })
  prediction: string;

  @Column('decimal', { precision: 10, scale: 3 })
  odds: number;

  @Column({ length: 20, default: 'pending' })
  result: string;

  @Column({ type: 'timestamp', nullable: true })
  matchDate: Date | null = null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
