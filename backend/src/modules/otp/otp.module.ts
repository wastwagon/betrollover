import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrationOtp } from './entities/registration-otp.entity';
import { EmailOtpService } from './email-otp.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RegistrationOtp]),
    EmailModule,
  ],
  providers: [EmailOtpService],
  exports: [EmailOtpService],
})
export class OtpModule {}
