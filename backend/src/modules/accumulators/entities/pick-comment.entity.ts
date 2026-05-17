import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('pick_comments')
export class PickComment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  accumulatorId: number;

  @Column()
  userId: number;

  @Column({ type: 'int', nullable: true })
  parentId: number | null;

  @Column({ type: 'text' })
  body: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
