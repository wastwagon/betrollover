import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Tipster } from './tipster.entity';

@Entity('tipster_follows')
@Unique(['userId', 'tipsterId'])
export class TipsterFollow {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  tipsterId: number;

  @ManyToOne(() => Tipster, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tipster_id' })
  tipster: Tipster;

  @CreateDateColumn({ name: 'followed_at' })
  followedAt: Date;
}
