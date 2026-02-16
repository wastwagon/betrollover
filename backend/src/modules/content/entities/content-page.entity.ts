import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('content_pages')
export class ContentPage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  slug: string;

  @Column({ length: 255 })
  title: string;

  @Column('text', { default: '' })
  content: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  metaDescription: string | null = null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
