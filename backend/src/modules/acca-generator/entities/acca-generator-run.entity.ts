import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('acca_generator_runs')
export class AccaGeneratorRun {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int' })
  legsRequested: number;

  @Column({ type: 'int' })
  legsReturned: number;

  @Column({ type: 'jsonb', default: [] })
  markets: string[];

  @Column({ type: 'decimal', precision: 8, scale: 3 })
  oddMin: number;

  @Column({ type: 'decimal', precision: 8, scale: 3 })
  oddMax: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, nullable: true })
  combinedOdds: number | null = null;

  @Column({ type: 'jsonb', default: [] })
  selections: Record<string, unknown>[];

  @Column({ type: 'int', nullable: true })
  publishedTicketId: number | null = null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
