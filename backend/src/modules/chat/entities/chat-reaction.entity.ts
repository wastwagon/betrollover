import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { ChatMessage } from './chat-message.entity';
import { User } from '../../users/entities/user.entity';

@Entity('chat_reactions')
@Unique(['messageId', 'userId', 'emoji'])
export class ChatReaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'message_id' })
  messageId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ length: 10 })
  emoji: string;

  @ManyToOne(() => ChatMessage, (m) => m.reactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_id' })
  message: ChatMessage;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
