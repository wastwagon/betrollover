import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { TransfersSyncService } from './transfers-sync.service';
import { NewsArticle } from './entities/news-article.entity';
import { ApiSettings } from '../admin/entities/api-settings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([NewsArticle, ApiSettings]),
  ],
  controllers: [NewsController],
  providers: [NewsService, TransfersSyncService],
  exports: [NewsService, TransfersSyncService],
})
export class NewsModule {}
