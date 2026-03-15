import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentPage } from './entities/content-page.entity';
import { sanitizeShortText, sanitizeText } from '../../common/sanitize.util';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(ContentPage)
    private repo: Repository<ContentPage>,
  ) {}

  async getBySlug(slug: string): Promise<ContentPage | null> {
    return this.repo.findOne({ where: { slug } });
  }

  async getAll() {
    return this.repo.find({ order: { slug: 'ASC' } });
  }

  async update(slug: string, data: { title?: string; content?: string; metaDescription?: string }) {
    const page = await this.repo.findOne({ where: { slug } });
    if (!page) throw new NotFoundException('Page not found');
    if (data.title !== undefined) page.title = sanitizeShortText(data.title, 255) || page.title;
    if (data.content !== undefined) page.content = sanitizeText(data.content, 50000);
    if (data.metaDescription !== undefined) page.metaDescription = sanitizeShortText(data.metaDescription, 500) || null;
    await this.repo.save(page);
    return page;
  }
}
