import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('smtp_settings')
export class SmtpSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255, default: 'smtp.sendgrid.net' })
  host: string;

  @Column({ default: 465 })
  port: number;

  @Column({ length: 255, default: 'apikey' })
  username: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  password: string | null = null;

  @Column({ length: 20, default: 'SSL' })
  encryption: string;

  @Column({ length: 255, default: 'noreply@betrollover.com' })
  fromEmail: string;

  @Column({ length: 255, default: 'BetRollover' })
  fromName: string;

  /** Inbox for admin-only alerts; merged with all users with role=admin when sending. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  adminNotificationEmail: string | null = null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
