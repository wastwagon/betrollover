import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { RolloverDay } from './rollover-day.entity';

@Entity('rollover_runs')
export class RolloverRun {
  @PrimaryGeneratedColumn()
  id: number;

  /** active | completed | broken */
  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: string;

  @Column({ type: 'int', default: 0 })
  currentDay: number;

  @Column({ type: 'varchar', length: 50 })
  ownerUsername: string;

  @CreateDateColumn({ type: 'timestamptz' })
  startedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null = null;

  @Column({ type: 'timestamptz', nullable: true })
  brokenAt: Date | null = null;

  @OneToMany(() => RolloverDay, (d) => d.run)
  days: RolloverDay[];
}
