import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ResourceItem } from './resource-item.entity';

export type ResourceLevel = 'beginner' | 'intermediate' | 'advanced';

@Entity('resource_categories')
export class ResourceCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  slug: string;

  @Column({ length: 100 })
  name: string;

  @Column('text', { nullable: true })
  description: string | null = null;

  @Column({ length: 20, default: 'beginner' })
  level: ResourceLevel;

  @Column({ default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ResourceItem, (item) => item.category)
  items: ResourceItem[];
}
