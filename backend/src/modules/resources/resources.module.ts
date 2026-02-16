import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { ResourceCategory } from './entities/resource-category.entity';
import { ResourceItem } from './entities/resource-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResourceCategory, ResourceItem]),
  ],
  controllers: [ResourcesController],
  providers: [ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {}
