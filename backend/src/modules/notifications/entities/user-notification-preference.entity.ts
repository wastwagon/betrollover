import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_notification_preferences')
@Index(['userId', 'notificationType'], { unique: true })
export class UserNotificationPreference {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  /** Category group key, e.g. marketplace, wallet, social. */
  @Column({ name: 'notification_type', length: 50 })
  notificationType: string;

  @Column({ name: 'email_enabled', default: true })
  emailEnabled: boolean;

  @Column({ name: 'in_app_enabled', default: true })
  inAppEnabled: boolean;

  @Column({ name: 'push_enabled', default: false })
  pushEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
