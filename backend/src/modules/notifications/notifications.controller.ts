import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@CurrentUser() user: User, @Query('limit') limit?: string) {
    return this.notificationsService.list(user.id, limit ? parseInt(limit, 10) : 20);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  async markRead(@CurrentUser() user: User, @Param('id') id: string) {
    return this.notificationsService.markRead(user.id, parseInt(id, 10));
  }
}
