import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ResourceCategory } from './resource-category.entity';

export type ResourceType = 'article' | 'strategy' | 'tool';

@Entity('resource_items')
export class ResourceItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  categoryId: number;

  @ManyToOne(() => ResourceCategory, (c) => c.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: ResourceCategory;

  @Column({ length: 100 })
  slug: string;

  @Column({ length: 255 })
  title: string;

  @Column('text', { nullable: true })
  excerpt: string | null = null;

  @Column('text', { default: '' })
  content: string;

  @Column({ length: 20, default: 'article' })
  type: ResourceType;

  @Column({ type: 'int', nullable: true })
  durationMinutes: number | null = null;

  @Column('jsonb', { nullable: true })
  toolConfig: Record<string, unknown> | null = null;

  @Column({ default: false })
  featured: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date | null = null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
