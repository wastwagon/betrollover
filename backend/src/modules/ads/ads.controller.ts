import { Controller, Get, Param, Post } from '@nestjs/common';
import { AdsService } from './ads.service';

@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Get('zone/:slug')
  async getAdForZone(@Param('slug') slug: string) {
    return this.adsService.getActiveAdForZone(slug);
  }

  @Post('impression/:id')
  async recordImpression(@Param('id') id: string) {
    await this.adsService.recordImpression(parseInt(id, 10));
    return { ok: true };
  }

  @Post('click/:id')
  async recordClick(@Param('id') id: string) {
    await this.adsService.recordClick(parseInt(id, 10));
    return { ok: true };
  }
}
