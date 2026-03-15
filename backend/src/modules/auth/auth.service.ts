import { Injectable, Logger, UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { resolveIpToCountry, countryCodeToFlagEmoji } from '../../common/geo.util';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import * as jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { WalletService } from '../wallet/wallet.service';
import { EmailOtpService } from '../otp/email-otp.service';
import { EmailService } from '../email/email.service';
import { User } from '../users/entities/user.entity';
import { Tipster } from '../predictions/entities/tipster.entity';
import { PasswordResetOtp } from '../otp/entities/password-reset-otp.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { ReferralsService } from '../referrals/referrals.service';
import { VisitorSession } from '../admin/entities/visitor-session.entity';

const REFRESH_TOKEN_EXPIRY_DAYS = 30;

export interface JwtPayload {
  sub: number;
  email: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private walletService: WalletService,
    private emailOtpService: EmailOtpService,
    private emailService: EmailService,
    private config: ConfigService,
    @InjectRepository(Tipster)
    private tipsterRepo: Repository<Tipster>,
    @InjectRepository(PasswordResetOtp)
    private passwordResetOtpRepo: Repository<PasswordResetOtp>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepo: Repository<RefreshToken>,
    private referralsService: ReferralsService,
    @InjectRepository(VisitorSession)
    private visitorSessionRepo: Repository<VisitorSession>,
  ) { }

  async sendRegistrationOtp(email: string) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('This email is already registered. Please sign in or use a different email.');
    }
    return this.emailOtpService.sendOtp(email.trim().toLowerCase());
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    const valid = await this.usersService.validatePassword(user, password);
    return valid ? user : null;
  }

  /** Create a JWT for a user (used by login and admin impersonation). */
  createTokenForUser(user: { id: number; email: string }): string {
    const payload: JwtPayload = { sub: user.id, email: user.email ?? '' };
    return this.jwtService.sign(payload);
  }

  /** Verify Google ID token and find or create user; return same shape as login(). */
  async googleLogin(idToken: string): Promise<ReturnType<AuthService['login']> extends Promise<infer R> ? R : never> {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId?.trim()) {
      throw new UnauthorizedException('Google sign-in is not configured.');
    }
    const client = new OAuth2Client(clientId);
    let payload: { sub?: string; email?: string; email_verified?: boolean; name?: string; picture?: string };
    try {
      const ticket = await client.verifyIdToken({ idToken: idToken.trim(), audience: clientId });
      payload = ticket.getPayload() || {};
    } catch {
      throw new UnauthorizedException('Invalid Google sign-in token. Please try again.');
    }
    const sub = payload.sub;
    if (!sub) throw new UnauthorizedException('Invalid Google token: missing subject.');

    let user: User | null = await this.usersService.findByProviderGoogleId(sub);
    if (user) {
      await this.usersService.updateLastLogin(user.id);
      return this.login(user);
    }

    const email = payload.email?.trim().toLowerCase();
    if (email && payload.email_verified) {
      const existing = await this.usersService.findByEmail(email);
      if (existing) {
        await this.usersService.updateProviderGoogleId(existing.id, sub);
        const updated = await this.usersService.findByProviderGoogleId(sub);
        if (updated) {
          await this.usersService.updateLastLogin(updated.id);
          return this.login(updated);
        }
      }
    }

    if (!email) {
      throw new UnauthorizedException('Google did not provide an email. Please use email/password sign-up or allow email in Google account.');
    }

    const newUser = await this.usersService.createFromGoogle({
      email,
      displayName: payload.name || email.split('@')[0] || 'User',
      providerGoogleId: sub,
      avatar: payload.picture || null,
    });
    await this.walletService.getOrCreateWallet(newUser.id);
    await this.ensureTipsterForUser(newUser);
    return this.login(newUser);
  }

  /** Verify Apple ID token (JWT) and find or create user; return same shape as login(). */
  async appleLogin(
    idToken: string,
    clientFirstNames?: { email?: string; name?: { firstName?: string; lastName?: string } },
  ): Promise<ReturnType<AuthService['login']> extends Promise<infer R> ? R : never> {
    const clientId = this.config.get<string>('APPLE_CLIENT_ID');
    if (!clientId?.trim()) {
      throw new UnauthorizedException('Apple sign-in is not configured.');
    }
    let payload: { sub?: string; email?: string; email_verified?: boolean | string };
    try {
      const decoded = jwt.decode(idToken.trim(), { complete: true }) as { header?: { kid?: string }; payload?: Record<string, unknown> } | null;
      if (!decoded?.header?.kid || !decoded?.payload) throw new Error('Invalid token structure');
      const client = jwksRsa({
        jwksUri: 'https://appleid.apple.com/auth/keys',
        cache: true,
        cacheMaxAge: 600000,
      });
      const key = await client.getSigningKey(decoded.header.kid);
      const pubKey = key.getPublicKey();
      const       verified = jwt.verify(idToken.trim(), pubKey, {
        algorithms: ['RS256'],
        issuer: 'https://appleid.apple.com',
        audience: clientId,
      }) as Record<string, unknown>;
      payload = {
        sub: verified.sub as string,
        email: verified.email as string | undefined,
        email_verified: verified.email_verified as boolean | string | undefined,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Apple id_token verification failed: ${msg}`);
      throw new UnauthorizedException('Invalid Apple sign-in token. Please try again.');
    }
    const sub = payload.sub;
    if (!sub) throw new UnauthorizedException('Invalid Apple token: missing subject.');

    let user: User | null = await this.usersService.findByProviderAppleId(sub);
    if (user) {
      await this.usersService.updateLastLogin(user.id);
      return this.login(user);
    }

    const emailFromToken = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
    const email = emailFromToken || (clientFirstNames?.email?.trim().toLowerCase());
    if (email && emailVerified) {
      const existing = await this.usersService.findByEmail(email);
      if (existing) {
        await this.usersService.updateProviderAppleId(existing.id, sub);
        const updated = await this.usersService.findByProviderAppleId(sub);
        if (updated) {
          await this.usersService.updateLastLogin(updated.id);
          return this.login(updated);
        }
      }
    }

    const displayNameFromClient = clientFirstNames?.name
      ? [clientFirstNames.name.firstName, clientFirstNames.name.lastName].filter(Boolean).join(' ').trim()
      : '';
    const emailForCreate = email || `apple_${sub}@privaterelay.appleid.local`;
    const displayName = displayNameFromClient || emailForCreate.split('@')[0] || 'User';

    const newUser = await this.usersService.createFromApple({
      email: emailForCreate,
      displayName,
      providerAppleId: sub,
    });
    await this.walletService.getOrCreateWallet(newUser.id);
    await this.ensureTipsterForUser(newUser);
    return this.login(newUser);
  }

  async login(user: User) {
    const fullUser = await this.usersService.findById(user.id);
    const refreshToken = await this.createRefreshToken(user.id);
    return {
      access_token: this.createTokenForUser(user),
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        emailVerifiedAt: (fullUser as User & { emailVerifiedAt?: Date })?.emailVerifiedAt ?? null,
        ageVerifiedAt: (fullUser as User & { ageVerifiedAt?: Date })?.ageVerifiedAt ?? null,
      },
    };
  }

  /** Create a refresh token for the user; revokes any existing tokens for this user. */
  private async createRefreshToken(userId: number): Promise<string> {
    await this.refreshTokenRepo.delete({ userId });
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({ userId, tokenHash: hash, expiresAt }),
    );
    return token;
  }

  /** Exchange a refresh token for a new access token and rotated refresh token. */
  async refresh(refreshToken: string) {
    if (!refreshToken?.trim()) throw new UnauthorizedException('Refresh token is required.');
    const hash = crypto.createHash('sha256').update(refreshToken.trim()).digest('hex');
    const record = await this.refreshTokenRepo.findOne({ where: { tokenHash: hash } });
    if (!record) throw new UnauthorizedException('Invalid or expired refresh token.');
    if (new Date() > record.expiresAt) {
      await this.refreshTokenRepo.delete({ id: record.id });
      throw new UnauthorizedException('Refresh token has expired. Please sign in again.');
    }
    const user = await this.usersService.findById(record.userId);
    if (!user) throw new UnauthorizedException('Account not found.');
    const newRefreshToken = await this.createRefreshToken(user.id);
    return {
      access_token: this.createTokenForUser(user),
      refresh_token: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        emailVerifiedAt: (user as User & { emailVerifiedAt?: Date })?.emailVerifiedAt ?? null,
        ageVerifiedAt: (user as User & { ageVerifiedAt?: Date })?.ageVerifiedAt ?? null,
      },
    };
  }

  /** Revoke a refresh token (call on logout). */
  async logout(refreshToken: string) {
    if (!refreshToken?.trim()) return { revoked: false };
    const hash = crypto.createHash('sha256').update(refreshToken.trim()).digest('hex');
    const result = await this.refreshTokenRepo.delete({ tokenHash: hash });
    return { revoked: (result.affected ?? 0) > 0 };
  }

  async register(data: {
    email: string;
    username: string;
    password: string;
    displayName: string;
    otpCode: string;
    dateOfBirth: string;
    referralCode?: string;
    sessionId?: string;
  }, clientIp?: string) {
    await this.emailOtpService.verifyOtp(data.email.trim().toLowerCase(), data.otpCode);
    const existing = await this.usersService.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('This email is already registered. Please sign in or use a different email.');
    }

    if (!this.usersService.isAtLeast18(data.dateOfBirth)) {
      throw new ForbiddenException('You must be at least 18 years old to register.');
    }

    // Resolve country from IP (fire-and-forget friendly; fallback to defaults)
    let country = 'Ghana';
    let countryCode = 'GHA';
    let flagEmoji = '🇬🇭';
    if (clientIp) {
      try {
        const geo = await resolveIpToCountry(clientIp);
        if (geo) {
          country = geo.country;
          countryCode = geo.countryCode;
          flagEmoji = countryCodeToFlagEmoji(geo.countryCode) || flagEmoji;
        }
      } catch {
        // Keep defaults on any error
      }
    }

    let user: User;
    try {
      user = await this.usersService.create({
        email: data.email,
        username: data.username,
        password: data.password,
        displayName: data.displayName,
        phone: undefined,
        dateOfBirth: data.dateOfBirth,
        country,
        countryCode,
        flagEmoji,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('users_username_key') || (msg.includes('unique constraint') && msg.toLowerCase().includes('username'))) {
        throw new ConflictException('This username is already taken. Please choose another.');
      }
      if (msg.includes('users_email_key') || (msg.includes('unique constraint') && msg.toLowerCase().includes('email'))) {
        throw new ConflictException('This email is already registered. Please sign in or use a different email.');
      }
      throw err;
    }
    await this.usersService.setEmailVerified(user.id);
    await this.walletService.getOrCreateWallet(user.id);
    await this.ensureTipsterForUser(user);

    // Register referral code if provided (fire-and-forget)
    if (data.referralCode?.trim()) {
      this.referralsService.registerSignup(user.id, data.referralCode.trim()).catch(() => {});
    }

    // Link analytics session to user for conversion attribution (fire-and-forget)
    if (data.sessionId?.trim()) {
      this.visitorSessionRepo.update(
        { sessionId: data.sessionId.trim().slice(0, 64) },
        { userId: user.id },
      ).catch(() => {});
    }

    this.emailService.sendAdminNotification({
      type: 'new_user_registered',
      metadata: {
        displayName: user.displayName,
        email: user.email,
        username: user.username,
      },
    }).catch(() => { });

    return this.login(user);
  }

  async verifyEmail(token: string): Promise<{ verified: boolean; message: string }> {
    if (!token?.trim()) return { verified: false, message: 'This verification link is invalid. Please request a new one.' };
    const user = await this.usersService.verifyEmailByToken(token.trim());
    if (!user) return { verified: false, message: 'This verification link is invalid or has expired. Please request a new one.' };
    return { verified: true, message: 'Email verified successfully. You can now sign in.' };
  }

  async resendVerificationEmail(userId: number): Promise<{ sent: boolean; message: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('Account not found.');
    const status = await this.usersService.getEmailVerificationStatus(userId);
    if (status.emailVerifiedAt) {
      return { sent: false, message: 'Your email is already verified. You can sign in.' };
    }
    const token = crypto.randomBytes(32).toString('hex');
    await this.usersService.setEmailVerificationToken(userId, token);
    const appUrl = this.config.get('APP_URL') || process.env.APP_URL || 'http://localhost:6002';
    const verifyUrl = `${appUrl}/verify-email?token=${token}`;
    const result = await this.emailService.sendVerificationEmail(
      (user as User).email,
      verifyUrl,
      user.displayName,
    );
    return result.sent
      ? { sent: true, message: 'Verification email sent. Check your inbox.' }
      : { sent: false, message: result.error || 'We couldn\'t send the verification email. Please try again later.' };
  }

  async getProfile(userId: number) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('Account not found.');
    return user;
  }

  private async ensureTipsterForUser(user: User): Promise<void> {
    const existing = await this.tipsterRepo.findOne({ where: { userId: user.id } });
    if (existing) return;
    const byUsername = await this.tipsterRepo.findOne({ where: { username: user.username } });
    if (byUsername) {
      byUsername.userId = user.id;
      byUsername.displayName = user.displayName;
      byUsername.avatarUrl = user.avatar;
      byUsername.bio = user.bio;
      await this.tipsterRepo.save(byUsername);
      return;
    }
    const tipster = this.tipsterRepo.create({
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatar,
      bio: user.bio,
      userId: user.id,
      isAi: false,
      tipsterType: 'human',
      isActive: true,
    });
    await this.tipsterRepo.save(tipster);
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('Account not found.');
    const valid = await this.usersService.validatePassword(user, currentPassword);
    if (!valid) throw new UnauthorizedException('Your current password is incorrect. Please try again.');
    const hashed = await bcrypt.hash(newPassword, 12);
    await this.usersService.updatePassword(userId, hashed);
  }

  async forgotPassword(email: string) {
    const normalized = email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalized);
    // Silent fail if user not found for security, but we can't send email
    if (!user) return { message: 'If an account exists with that email, a reset code has been sent.' };

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.passwordResetOtpRepo.delete({ email: normalized });
    await this.passwordResetOtpRepo.save(
      this.passwordResetOtpRepo.create({ email: normalized, code, expiresAt }),
    );

    await this.emailService.sendPasswordResetOtp(normalized, code);
    return { message: 'If an account exists with that email, a reset code has been sent.' };
  }

  async resetPassword(data: { email: string; code: string; newPassword: string }) {
    const normalized = data.email.trim().toLowerCase();
    const record = await this.passwordResetOtpRepo.findOne({
      where: { email: normalized, code: data.code, isUsed: false },
    });

    if (!record) {
      throw new UnauthorizedException('The reset code is invalid or has expired. Please request a new one.');
    }

    if (new Date() > record.expiresAt) {
      throw new UnauthorizedException('The reset code has expired. Please request a new password reset.');
    }

    const user = await this.usersService.findByEmail(normalized);
    if (!user) {
      throw new UnauthorizedException('Account not found.');
    }

    const hashed = await bcrypt.hash(data.newPassword, 12);
    await this.usersService.updatePassword(user.id, hashed);

    record.isUsed = true;
    await this.passwordResetOtpRepo.save(record);

    return { message: 'Password reset successful' };
  }
}
