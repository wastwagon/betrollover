import { Controller, Get, UseGuards } from '@nestjs/common';
import { TipsterService } from './tipster.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('tipster')
export class TipsterController {
  constructor(private readonly tipsterService: TipsterService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@CurrentUser() user: User) {
    return this.tipsterService.getStats(user.id, user.role);
  }
}
