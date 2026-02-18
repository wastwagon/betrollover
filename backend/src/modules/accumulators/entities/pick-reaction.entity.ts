import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';

@Entity('pick_reactions')
@Unique(['userId', 'accumulatorId'])
export class PickReaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  accumulatorId: number;

  @Column({ length: 20, default: 'like' })
  type: string;

  @CreateDateColumn()
  createdAt: Date;
}
