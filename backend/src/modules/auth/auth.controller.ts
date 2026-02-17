import { Body, Controller, Get, Logger, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) { }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 300000 } }) // 5 attempts per 5 min per IP (brute-force protection)
  @UseGuards(LocalAuthGuard)
  async login(@Body() _dto: LoginDto, @CurrentUser() user: User) {
    try {
      return await this.authService.login(user);
    } catch (err: any) {
      this.logger.error(`[Login] 500 for user ${user?.id ?? '?'}: ${err?.message ?? err}`, err?.stack);
      throw err;
    }
  }

  @Post('otp/send')
  @Throttle({ default: { limit: 5, ttl: 90000 } }) // 5 OTP requests per 15 min per IP
  async sendOtp(@Body() body: { email: string }) {
    return this.authService.sendRegistrationOtp(body.email);
  }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 registrations per hour per IP
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 per 5 min
  async resendVerification(@CurrentUser() user: User) {
    return this.authService.resendVerificationEmail(user.id);
  }
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: User,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    await this.authService.changePassword(user.id, body.currentPassword, body.newPassword);
    return { message: 'Password updated' };
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 90000 } }) // 3 requests per 15 min per IP
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 300000 } }) // 5 attempts per 5 min
  async resetPassword(@Body() body: { email: string; code: string; newPassword: string }) {
    return this.authService.resetPassword(body);
  }
}
