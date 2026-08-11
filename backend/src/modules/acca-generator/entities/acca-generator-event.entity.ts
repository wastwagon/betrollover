import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('acca_generator_events')
export class AccaGeneratorEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  @Index()
  userId: number | null = null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ type: 'varchar', length: 64 })
  @Index()
  eventType: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown> = {};

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
