import { Controller, Get, Param, Query } from '@nestjs/common';
import { NewsService } from './news.service';
import { NewsCategory } from './entities/news-article.entity';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  async list(
    @Query('category') category?: NewsCategory,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('featured') featured?: string,
  ) {
    return this.newsService.findAll({
      category,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      featured: featured === 'true',
    });
  }

  @Get(':slug')
  async getBySlug(@Param('slug') slug: string) {
    return this.newsService.getBySlugOrFail(slug);
  }
}
