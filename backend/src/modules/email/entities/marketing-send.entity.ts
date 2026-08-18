import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('marketing_sends')
@Index(['userId', 'campaignKey'], { unique: true })
export class MarketingSend {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ length: 64 })
  campaignKey: string;

  @CreateDateColumn()
  sentAt: Date;
}
