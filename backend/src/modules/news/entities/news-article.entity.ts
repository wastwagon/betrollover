import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type NewsCategory = 'news' | 'transfer_rumour' | 'confirmed_transfer' | 'gossip' | 'injury';

@Entity('news_articles')
export class NewsArticle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ length: 255 })
  title: string;

  @Column('text', { nullable: true })
  excerpt: string | null = null;

  @Column('text', { default: '' })
  content: string;

  @Column({ length: 50, default: 'news' })
  category: NewsCategory;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null = null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  sourceUrl: string | null = null;

  @Column({ default: false })
  featured: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  metaDescription: string | null = null;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date | null = null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
