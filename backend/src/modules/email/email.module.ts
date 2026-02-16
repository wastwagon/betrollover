import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailService } from './email.service';
import { SmtpSettings } from './entities/smtp-settings.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SmtpSettings]),
    UsersModule,
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
