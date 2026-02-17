import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrationOtp } from './entities/registration-otp.entity';
import { PasswordResetOtp } from './entities/password-reset-otp.entity';
import { EmailOtpService } from './email-otp.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RegistrationOtp, PasswordResetOtp]),
    EmailModule,
  ],
  providers: [EmailOtpService],
  exports: [EmailOtpService],
})
export class OtpModule { }
