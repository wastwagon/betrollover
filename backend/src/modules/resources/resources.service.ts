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

  async getCategories(language = 'en'): Promise<ResourceCategory[]> {
    const lang = language.toLowerCase().slice(0, 5);
    let categories = await this.categoryRepo.find({
      where: { language: lang },
      order: { sortOrder: 'ASC', id: 'ASC' },
      relations: ['items'],
    });
    if (categories.length === 0 && lang !== 'en') {
      categories = await this.categoryRepo.find({
        where: { language: 'en' },
        order: { sortOrder: 'ASC', id: 'ASC' },
        relations: ['items'],
      });
    }
    const now = new Date();
    for (const cat of categories) {
      const catLang = (cat as any).language || 'en';
      (cat as any).items = (cat.items || []).filter(
        (i: ResourceItem) => i.publishedAt && i.publishedAt <= now && i.language === catLang,
      );
    }
    return categories;
  }

  async getCategoryBySlug(slug: string, language = 'en'): Promise<ResourceCategory | null> {
    const lang = language.toLowerCase().slice(0, 5);
    let cat = await this.categoryRepo.findOne({ where: { slug, language: lang } });
    if (!cat && lang !== 'en') {
      cat = await this.categoryRepo.findOne({ where: { slug, language: 'en' } });
    }
    if (!cat) return null;
    const catLang = (cat as any).language || 'en';
    const items = await this.itemRepo.find({
      where: { categoryId: cat.id, language: catLang },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    const now = new Date();
    (cat as any).items = items.filter((i) => i.publishedAt && i.publishedAt <= now);
    return cat;
  }

  async getItemBySlug(categorySlug: string, itemSlug: string, language = 'en'): Promise<ResourceItem | null> {
    const lang = language.toLowerCase().slice(0, 5);
    const category = await this.categoryRepo.findOne({ where: { slug: categorySlug, language: lang } });
    if (!category) return null;
    let item = await this.itemRepo.findOne({
      where: { categoryId: category.id, slug: itemSlug, language: lang },
      relations: ['category'],
    });
    if (!item && lang !== 'en') {
      const catEn = await this.categoryRepo.findOne({ where: { slug: categorySlug, language: 'en' } });
      if (catEn) {
        item = await this.itemRepo.findOne({
          where: { categoryId: catEn.id, slug: itemSlug, language: 'en' },
          relations: ['category'],
        });
      }
    }
    return item;
  }

  async getItemOrFail(categorySlug: string, itemSlug: string, language = 'en'): Promise<ResourceItem> {
    const item = await this.getItemBySlug(categorySlug, itemSlug, language);
    if (!item) throw new NotFoundException('Resource not found');
    return item;
  }

  async listPublishedItems(params?: { categorySlug?: string; type?: ResourceType; limit?: number; language?: string }) {
    const lang = (params?.language || 'en').toLowerCase().slice(0, 5);
    const qb = this.itemRepo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.category', 'c')
      .where('i.publishedAt IS NOT NULL')
      .andWhere('i.publishedAt <= :now', { now: new Date() })
      .andWhere('i.language = :language', { language: lang })
      .orderBy('i.publishedAt', 'DESC');

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

  async adminGetCategory(id: number): Promise<ResourceCategory | null> {
    return this.categoryRepo.findOne({ where: { id } });
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

  async adminGetItem(id: number): Promise<ResourceItem | null> {
    return this.itemRepo.findOne({ where: { id }, relations: ['category'] });
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
