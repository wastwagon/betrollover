import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('visitor_sessions')
export class VisitorSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64 })
  @Index()
  sessionId: string;

  @Column({ type: 'int', nullable: true })
  @Index()
  userId: number | null = null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  page: string | null = null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  referrer: string | null = null;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null = null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  country: string | null = null;

  @CreateDateColumn()
  createdAt: Date;
}
