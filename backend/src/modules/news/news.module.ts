import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { TransfersSyncService } from './transfers-sync.service';
import { NewsArticle } from './entities/news-article.entity';
import { ApiSettings } from '../admin/entities/api-settings.entity';

import { InjuriesSyncService } from './injuries-sync.service';
import { NewsSyncProbeService } from './news-sync-probe.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NewsArticle, ApiSettings]),
  ],
  controllers: [NewsController],
  providers: [TransfersSyncService, InjuriesSyncService, NewsSyncProbeService, NewsService],
  exports: [TransfersSyncService, InjuriesSyncService, NewsSyncProbeService, NewsService],
})
export class NewsModule { }
