import { Controller, Get, Param } from '@nestjs/common';
import { ContentService } from './content.service';

@Controller('pages')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get(':slug')
  async getBySlug(@Param('slug') slug: string) {
    const page = await this.contentService.getBySlug(slug);
    if (!page) return null;
    return page;
  }
}
