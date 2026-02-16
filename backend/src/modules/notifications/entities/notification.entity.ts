import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ length: 50 })
  type: string;

  @Column({ length: 255 })
  title: string;

  @Column('text')
  message: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  link: string | null = null;

  @Column({ length: 50, default: 'bell' })
  icon: string;

  @Column({ length: 20, default: 'medium' })
  priority: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date | null = null;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, unknown> | null = null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
