import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('admin_audit_log')
export class AdminAuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'admin_id' })
  adminId: number;

  @Column({ length: 80 })
  action: string;

  @Column({ name: 'target_type', length: 40 })
  targetType: string;

  @Column({ name: 'target_id', type: 'varchar', length: 64, nullable: true })
  targetId: string | null = null;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, unknown> | null = null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
