import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { RolloverRun } from './rollover-run.entity';
import { AccumulatorTicket } from '../../accumulators/entities/accumulator-ticket.entity';

@Entity('rollover_days')
@Unique(['runId', 'dayNumber'])
export class RolloverDay {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  runId: number;

  @ManyToOne(() => RolloverRun, (r) => r.days, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'run_id' })
  run: RolloverRun;

  @Column({ type: 'int' })
  dayNumber: number;

  @Column({ type: 'date' })
  calendarDate: string;

  @Column({ type: 'int', nullable: true })
  ticketId: number | null = null;

  @ManyToOne(() => AccumulatorTicket, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'ticket_id' })
  ticket: AccumulatorTicket | null;

  /** pending | won | lost | void | skipped */
  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: string;

  @Column({ type: 'decimal', precision: 8, scale: 3, nullable: true })
  combinedOdds: number | null = null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  settledAt: Date | null = null;
}
