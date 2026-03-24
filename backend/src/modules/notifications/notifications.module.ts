import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { TipsterFollow } from '../predictions/entities/tipster-follow.entity';
import { Tipster } from '../predictions/entities/tipster.entity';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { EmailModule } from '../email/email.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User, TipsterFollow, Tipster, ApiSettings]),
    EmailModule,
    PushModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
