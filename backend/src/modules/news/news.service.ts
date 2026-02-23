import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { NewsArticle, NewsCategory } from './entities/news-article.entity';
// NewsSport imported indirectly via entity

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(NewsArticle)
    private repo: Repository<NewsArticle>,
  ) { }

  async findAll(params?: { category?: NewsCategory; sport?: string; limit?: number; offset?: number; featured?: boolean; language?: string }) {
    const qb = this.repo
      .createQueryBuilder('a')
      .where('a.publishedAt IS NOT NULL')
      .andWhere('a.publishedAt <= :now', { now: new Date() })
      .orderBy('a.publishedAt', 'DESC');

    const lang = (params?.language || 'en').toLowerCase().slice(0, 5);
    qb.andWhere('a.language = :language', { language: lang });

    if (params?.category) {
      qb.andWhere('a.category = :category', { category: params.category });
    }
    if (params?.sport) {
      qb.andWhere('a.sport = :sport', { sport: params.sport.toLowerCase() });
    }
    if (params?.featured) {
      qb.andWhere('a.featured = true');
    }

    const limit = params?.limit ?? 20;
    const offset = params?.offset ?? 0;
    qb.take(limit).skip(offset);

    return qb.getMany();
  }

  async getBySlug(slug: string, language = 'en'): Promise<NewsArticle | null> {
    const lang = language.toLowerCase().slice(0, 5);
    let a = await this.repo.findOne({ where: { slug, language: lang } });
    if (!a && lang !== 'en') {
      a = await this.repo.findOne({ where: { slug, language: 'en' } });
    }
    return a;
  }

  async getBySlugOrFail(slug: string, language = 'en'): Promise<NewsArticle> {
    const a = await this.getBySlug(slug, language);
    if (!a) throw new NotFoundException('Article not found');
    return a;
  }

  async create(data: Partial<NewsArticle>): Promise<NewsArticle> {
    const article = this.repo.create(data);
    return this.repo.save(article);
  }

  async update(id: number, data: Partial<NewsArticle>): Promise<NewsArticle> {
    const article = await this.repo.findOne({ where: { id } });
    if (!article) throw new NotFoundException('Article not found');
    Object.assign(article, data);
    return this.repo.save(article);
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }

  // Admin: list all (including unpublished)
  async adminList(): Promise<NewsArticle[]> {
    return this.repo.find({ order: { publishedAt: 'DESC', id: 'DESC' } });
  }

  async findById(id: number): Promise<NewsArticle | null> {
    return this.repo.findOne({ where: { id } });
  }
}
