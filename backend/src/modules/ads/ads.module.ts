import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';
import { AdZone } from './entities/ad-zone.entity';
import { AdCampaign } from './entities/ad-campaign.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AdZone, AdCampaign])],
  controllers: [AdsController],
  providers: [AdsService],
  exports: [AdsService],
})
export class AdsModule {}
