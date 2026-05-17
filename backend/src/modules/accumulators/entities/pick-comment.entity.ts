import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('pick_comments')
export class PickComment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'accumulator_id' })
  accumulatorId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'parent_id', type: 'int', nullable: true })
  parentId: number | null;

  @Column({ type: 'text' })
  body: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
