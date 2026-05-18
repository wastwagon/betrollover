import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
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

  @Get('preferences')
  @UseGuards(JwtAuthGuard)
  async getPreferences(@CurrentUser() user: User) {
    return this.notificationsService.getPreferenceGroups(user.id);
  }

  @Patch('preferences')
  @UseGuards(JwtAuthGuard)
  async updatePreferences(
    @CurrentUser() user: User,
    @Body()
    body: {
      emailNotifications?: boolean;
      pushNotifications?: boolean;
      groups?: Array<{
        group: string;
        emailEnabled?: boolean;
        inAppEnabled?: boolean;
        pushEnabled?: boolean;
      }>;
    },
  ) {
    return this.notificationsService.updatePreferenceGroups(user.id, body);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  async markRead(@CurrentUser() user: User, @Param('id') id: string) {
    return this.notificationsService.markRead(user.id, parseInt(id, 10));
  }
}
