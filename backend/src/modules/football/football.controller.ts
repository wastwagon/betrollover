import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FootballService } from './football.service';

@Controller('football')
@UseGuards(JwtAuthGuard)
export class FootballController {
  constructor(private readonly footballService: FootballService) {}

  @Get('fixtures')
  async getFixtures(@Query('date') date?: string) {
    return this.footballService.getFixtures(date);
  }

  @Get('leagues')
  async getLeagues() {
    return this.footballService.getLeagues();
  }
}
