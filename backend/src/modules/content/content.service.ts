import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentPage } from './entities/content-page.entity';

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
    let page = await this.repo.findOne({ where: { slug } });
    if (!page) throw new NotFoundException('Page not found');
    if (data.title !== undefined) page.title = data.title;
    if (data.content !== undefined) page.content = data.content;
    if (data.metaDescription !== undefined) page.metaDescription = data.metaDescription;
    await this.repo.save(page);
    return page;
  }
}
