import { Controller, Get, Param, Query } from '@nestjs/common';
import { ResourcesService } from './resources.service';
import { ResourceType } from './entities/resource-item.entity';

@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get('categories')
  async getCategories() {
    return this.resourcesService.getCategories();
  }

  @Get('items')
  async listItems(
    @Query('category') categorySlug?: string,
    @Query('type') type?: ResourceType,
    @Query('limit') limit?: string,
  ) {
    return this.resourcesService.listPublishedItems({
      categorySlug,
      type,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('categories/:categorySlug')
  async getCategory(@Param('categorySlug') categorySlug: string) {
    const cat = await this.resourcesService.getCategoryBySlug(categorySlug);
    if (!cat) return null;
    return cat;
  }

  @Get('categories/:categorySlug/items/:itemSlug')
  async getItem(
    @Param('categorySlug') categorySlug: string,
    @Param('itemSlug') itemSlug: string,
  ) {
    return this.resourcesService.getItemOrFail(categorySlug, itemSlug);
  }
}
