import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { ChatMessage } from './chat-message.entity';
import { User } from '../../users/entities/user.entity';

@Entity('chat_reports')
@Unique(['messageId', 'reporterId'])
export class ChatReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'message_id' })
  messageId: number;

  @Column({ name: 'reporter_id' })
  reporterId: number;

  @Column({ length: 50, default: 'spam' })
  reason: string;

  @Column({ name: 'is_reviewed', default: false })
  isReviewed: boolean;

  @Column({ name: 'reviewed_by', nullable: true })
  reviewedBy: number;

  @Column({ name: 'reviewed_at', nullable: true })
  reviewedAt: Date;

  @ManyToOne(() => ChatMessage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_id' })
  message: ChatMessage;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporter_id' })
  reporter: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
