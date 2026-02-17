import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { TransfersSyncService } from './transfers-sync.service';
import { NewsArticle } from './entities/news-article.entity';
import { ApiSettings } from '../admin/entities/api-settings.entity';

import { InjuriesSyncService } from './injuries-sync.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NewsArticle, ApiSettings]),
  ],
  controllers: [NewsController],
  providers: [TransfersSyncService, InjuriesSyncService, NewsService],
  exports: [TransfersSyncService, InjuriesSyncService, NewsService],
})
export class NewsModule { }
