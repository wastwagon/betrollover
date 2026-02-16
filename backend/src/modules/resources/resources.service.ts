import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceCategory } from './entities/resource-category.entity';
import { ResourceItem, ResourceType } from './entities/resource-item.entity';

@Injectable()
export class ResourcesService {
  constructor(
    @InjectRepository(ResourceCategory)
    private categoryRepo: Repository<ResourceCategory>,
    @InjectRepository(ResourceItem)
    private itemRepo: Repository<ResourceItem>,
  ) {}

  async getCategories(): Promise<ResourceCategory[]> {
    const categories = await this.categoryRepo.find({
      order: { sortOrder: 'ASC', id: 'ASC' },
      relations: ['items'],
    });
    const now = new Date();
    for (const cat of categories) {
      (cat as any).items = (cat.items || []).filter((i) => i.publishedAt && i.publishedAt <= now);
    }
    return categories;
  }

  async getCategoryBySlug(slug: string): Promise<ResourceCategory | null> {
    const cat = await this.categoryRepo.findOne({ where: { slug } });
    if (!cat) return null;
    const items = await this.itemRepo.find({
      where: { categoryId: cat.id },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    const now = new Date();
    (cat as any).items = items.filter((i) => i.publishedAt && i.publishedAt <= now);
    return cat;
  }

  async getItemBySlug(categorySlug: string, itemSlug: string): Promise<ResourceItem | null> {
    const category = await this.categoryRepo.findOne({ where: { slug: categorySlug } });
    if (!category) return null;
    return this.itemRepo.findOne({
      where: { categoryId: category.id, slug: itemSlug },
      relations: ['category'],
    });
  }

  async getItemOrFail(categorySlug: string, itemSlug: string): Promise<ResourceItem> {
    const item = await this.getItemBySlug(categorySlug, itemSlug);
    if (!item) throw new NotFoundException('Resource not found');
    return item;
  }

  async listPublishedItems(params?: { categorySlug?: string; type?: ResourceType; limit?: number }) {
    const qb = this.itemRepo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.category', 'c')
      .where('i.published_at IS NOT NULL')
      .andWhere('i.published_at <= :now', { now: new Date() })
      .orderBy('i.published_at', 'DESC');

    if (params?.categorySlug) {
      qb.andWhere('c.slug = :slug', { slug: params.categorySlug });
    }
    if (params?.type) {
      qb.andWhere('i.type = :type', { type: params.type });
    }
    if (params?.limit) {
      qb.take(params.limit);
    }

    return qb.getMany();
  }

  // Admin
  async adminListCategories(): Promise<ResourceCategory[]> {
    return this.categoryRepo.find({
      order: { sortOrder: 'ASC' },
      relations: ['items'],
    });
  }

  async adminCreateCategory(data: Partial<ResourceCategory>): Promise<ResourceCategory> {
    const cat = this.categoryRepo.create(data);
    return this.categoryRepo.save(cat);
  }

  async adminUpdateCategory(id: number, data: Partial<ResourceCategory>): Promise<ResourceCategory> {
    const cat = await this.categoryRepo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    Object.assign(cat, data);
    return this.categoryRepo.save(cat);
  }

  async adminCreateItem(data: Partial<ResourceItem>): Promise<ResourceItem> {
    const item = this.itemRepo.create(data);
    return this.itemRepo.save(item);
  }

  async adminUpdateItem(id: number, data: Partial<ResourceItem>): Promise<ResourceItem> {
    const item = await this.itemRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Item not found');
    Object.assign(item, data);
    return this.itemRepo.save(item);
  }

  async adminDeleteItem(id: number): Promise<void> {
    await this.itemRepo.delete(id);
  }
}
