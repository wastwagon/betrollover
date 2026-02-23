import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SportEvent } from './sport-event.entity';

@Entity('sport_event_odds')
@Index(['sportEventId'])
export class SportEventOdd {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sportEventId: number;

  @ManyToOne(() => SportEvent, (e) => e.odds, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sport_event_id' })
  sportEvent: SportEvent;

  @Column({ type: 'varchar', length: 100 })
  marketName: string;

  @Column({ type: 'varchar', length: 100 })
  marketValue: string;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  odds: number;

  @CreateDateColumn()
  createdAt: Date;
}
