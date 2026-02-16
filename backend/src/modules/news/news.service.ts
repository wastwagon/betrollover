import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { NewsArticle, NewsCategory } from './entities/news-article.entity';

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(NewsArticle)
    private repo: Repository<NewsArticle>,
  ) {}

  async findAll(params?: { category?: NewsCategory; limit?: number; offset?: number; featured?: boolean }) {
    const qb = this.repo
      .createQueryBuilder('a')
      .where('a.published_at IS NOT NULL')
      .andWhere('a.published_at <= :now', { now: new Date() })
      .orderBy('a.published_at', 'DESC');

    if (params?.category) {
      qb.andWhere('a.category = :category', { category: params.category });
    }
    if (params?.featured) {
      qb.andWhere('a.featured = true');
    }

    const limit = params?.limit ?? 20;
    const offset = params?.offset ?? 0;
    qb.take(limit).skip(offset);

    return qb.getMany();
  }

  async getBySlug(slug: string): Promise<NewsArticle | null> {
    return this.repo.findOne({
      where: { slug },
    });
  }

  async getBySlugOrFail(slug: string): Promise<NewsArticle> {
    const a = await this.getBySlug(slug);
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
}
