import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { User, UserRole } from './entities/user.entity';
import { TipsterRequest } from './entities/tipster-request.entity';
import { Tipster } from '../predictions/entities/tipster.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(TipsterRequest)
    private tipsterRequestRepo: Repository<TipsterRequest>,
    @InjectRepository(Tipster)
    private tipsterRepo: Repository<Tipster>,
  ) {}

  async getAdminEmails(): Promise<string[]> {
    const admins = await this.usersRepository.find({
      where: { role: UserRole.ADMIN },
      select: ['email'],
    });
    return admins.map((u) => u.email).filter(Boolean);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'username', 'displayName', 'role', 'status', 'providerGoogleId', 'providerAppleId'],
    });
  }

  async findByPhone(phone: string): Promise<User | null> {
    if (!phone) return null;
    return this.usersRepository.findOne({
      where: { phone },
      select: ['id', 'email', 'username', 'displayName', 'role', 'status'],
    });
  }

  async findByProviderGoogleId(providerGoogleId: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { providerGoogleId },
      select: ['id', 'email', 'username', 'displayName', 'role', 'status', 'providerGoogleId'],
    });
  }

  async findByProviderAppleId(providerAppleId: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { providerAppleId },
      select: ['id', 'email', 'username', 'displayName', 'role', 'status', 'providerAppleId'],
    });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      select: ['id', 'email', 'contactEmail', 'username', 'displayName', 'avatar', 'phone', 'role', 'status', 'createdAt', 'emailVerifiedAt', 'ageVerifiedAt'],
    });
  }

  async create(data: {
    email: string;
    username: string;
    password: string;
    displayName: string;
    phone?: string;
    role?: string;
    dateOfBirth?: string;
    country?: string;
    countryCode?: string;
    flagEmoji?: string;
  }): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 12);
    const user = this.usersRepository.create({
      email: data.email,
      username: data.username,
      password: hashedPassword,
      displayName: data.displayName || data.username,
      phone: data.phone || null,
      role: (data.role as UserRole) || UserRole.TIPSTER,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      ageVerifiedAt: new Date(), // Age verification disabled – treat all new users as verified
      country: data.country ?? 'Ghana',
      countryCode: data.countryCode ?? 'GHA',
      flagEmoji: data.flagEmoji ?? '🇬🇭',
    });
    return this.usersRepository.save(user);
  }

  /** Create user from Google OAuth (no password). Username derived from email or sub. */
  async createFromGoogle(data: {
    email: string;
    displayName: string;
    providerGoogleId: string;
    avatar?: string | null;
  }): Promise<User> {
    const baseUsername = data.email.includes('@')
      ? data.email.replace(/@.*$/, '').replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 20) || 'user'
      : `google_${data.providerGoogleId.slice(0, 12)}`;
    let username = baseUsername;
    let attempts = 0;
    while (attempts < 100) {
      const existing = await this.usersRepository.findOne({ where: { username }, select: ['id'] });
      if (!existing) break;
      username = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
      attempts++;
    }
    const user = this.usersRepository.create({
      email: data.email,
      username,
      password: null,
      displayName: data.displayName || username,
      avatar: data.avatar ?? null,
      role: UserRole.TIPSTER,
      providerGoogleId: data.providerGoogleId,
      emailVerifiedAt: new Date(), // Google is trusted
      ageVerifiedAt: new Date(), // Same as email register: treat as verified
      country: 'Ghana',
      countryCode: 'GHA',
      flagEmoji: '🇬🇭',
    });
    return this.usersRepository.save(user);
  }

  /** Create user from Apple OAuth (no password). Email may be private relay. */
  async createFromApple(data: {
    email: string;
    displayName: string;
    providerAppleId: string;
  }): Promise<User> {
    const baseUsername = data.email.includes('@')
      ? data.email.replace(/@.*$/, '').replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 20) || 'user'
      : `apple_${data.providerAppleId.slice(0, 12)}`;
    let username = baseUsername;
    let attempts = 0;
    while (attempts < 100) {
      const existing = await this.usersRepository.findOne({ where: { username }, select: ['id'] });
      if (!existing) break;
      username = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
      attempts++;
    }
    const user = this.usersRepository.create({
      email: data.email,
      username,
      password: null,
      displayName: data.displayName || username,
      avatar: null,
      role: UserRole.TIPSTER,
      providerAppleId: data.providerAppleId,
      emailVerifiedAt: new Date(),
      ageVerifiedAt: new Date(),
      country: 'Ghana',
      countryCode: 'GHA',
      flagEmoji: '🇬🇭',
    });
    return this.usersRepository.save(user);
  }

  /** Check if date string (YYYY-MM-DD) is at least 18 years ago */
  isAtLeast18(dateStr: string): boolean {
    const birth = new Date(dateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 18;
  }

  async verifyAge(userId: number, dateOfBirth: string): Promise<{ verified: boolean; message: string }> {
    if (!this.isAtLeast18(dateOfBirth)) {
      return { verified: false, message: 'You must be at least 18 years old to use this service.' };
    }
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) return { verified: false, message: 'Account not found.' };
    await this.usersRepository.update(userId, {
      dateOfBirth: new Date(dateOfBirth),
      ageVerifiedAt: new Date(),
    });
    return { verified: true, message: 'Age verified successfully' };
  }

  async isAgeVerified(userId: number): Promise<boolean> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['ageVerifiedAt'],
    });
    return !!user?.ageVerifiedAt;
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    const fullUser = await this.usersRepository.findOne({
      where: { id: user.id },
      select: ['password'],
    });
    if (!fullUser?.password) return false; // OAuth-only users have no password
    return bcrypt.compare(password, fullUser.password);
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value?.trim() ?? '');
  }

  async updateProfile(
    id: number,
    data: { displayName?: string; phone?: string; avatar?: string | null; contactEmail?: string | null },
  ): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new BadRequestException('Account not found.');
    if (data.displayName !== undefined) user.displayName = data.displayName;
    if (data.phone !== undefined) user.phone = data.phone;
    if (data.contactEmail !== undefined) {
      const v = data.contactEmail?.trim() || null;
      if (v && !this.isValidEmail(v)) throw new BadRequestException('Contact email must be a valid email address.');
      user.contactEmail = v || null;
    }
    if (data.avatar !== undefined) {
      user.avatar = data.avatar || null;
      await this.syncAvatarToTipster(id, user.avatar);
    }
    await this.usersRepository.save(user);
    return this.findById(id) as Promise<User>;
  }

  async uploadAvatar(userId: number, file: Express.Multer.File): Promise<User> {
    if (!file?.buffer) throw new BadRequestException('No image was received. Please select a file and try again.');
    const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const ext = (file.mimetype === 'image/jpeg' ? '.jpg' : file.mimetype === 'image/png' ? '.png' : file.mimetype === 'image/webp' ? '.webp' : '.gif');
    const filename = `avatar_${userId}_${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, file.buffer);
    const avatarPath = `/uploads/avatars/${filename}`;
    await this.updateProfile(userId, { avatar: avatarPath });
    return this.findById(userId) as Promise<User>;
  }

  private async syncAvatarToTipster(userId: number, avatarUrl: string | null): Promise<void> {
    const tipster = await this.tipsterRepo.findOne({ where: { userId } });
    if (tipster) {
      tipster.avatarUrl = avatarUrl;
      await this.tipsterRepo.save(tipster);
    }
  }

  async updatePassword(id: number, hashedPassword: string): Promise<void> {
    await this.usersRepository.update(id, { password: hashedPassword });
  }

  async updateProviderGoogleId(userId: number, providerGoogleId: string): Promise<void> {
    await this.usersRepository.update(userId, { providerGoogleId });
  }

  async updateProviderAppleId(userId: number, providerAppleId: string): Promise<void> {
    await this.usersRepository.update(userId, { providerAppleId });
  }

  async updateLastLogin(userId: number): Promise<void> {
    await this.usersRepository.update(userId, { lastLogin: new Date() });
  }

  async setEmailVerificationToken(id: number, token: string): Promise<void> {
    await this.usersRepository.update(id, { emailVerificationToken: token });
  }

  async setEmailVerified(id: number): Promise<void> {
    await this.usersRepository.update(id, {
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
    });
  }

  async verifyEmailByToken(token: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { emailVerificationToken: token },
      select: ['id', 'email', 'username', 'displayName', 'role', 'emailVerifiedAt'],
    });
    if (!user) return null;
    await this.usersRepository.update(user.id, {
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
    });
    return this.usersRepository.findOne({ where: { id: user.id } });
  }

  async getEmailVerificationStatus(id: number): Promise<{ emailVerifiedAt: Date | null }> {
    const u = await this.usersRepository.findOne({
      where: { id },
      select: ['emailVerifiedAt'],
    });
    return u ? { emailVerifiedAt: u.emailVerifiedAt } : { emailVerifiedAt: null };
  }

  async requestTipster(userId: number): Promise<{ status: string; message: string }> {
    const { emailVerifiedAt } = await this.getEmailVerificationStatus(userId);
    if (!emailVerifiedAt) {
      throw new ForbiddenException('Please verify your email before requesting tipster status.');
    }
    const user = await this.usersRepository.findOne({ where: { id: userId }, select: ['id', 'role', 'username', 'displayName', 'avatar', 'bio'] });
    if (!user) throw new BadRequestException('Account not found.');
    if (user.role === UserRole.TIPSTER || user.role === UserRole.ADMIN) {
      return { status: 'already_tipster', message: 'You are already a tipster.' };
    }
    // Auto-approve: tipsters are approved immediately
    await this.ensureTipsterForUser(user);
    await this.usersRepository.update(userId, { role: UserRole.TIPSTER });
    const existingReq = await this.tipsterRequestRepo.findOne({ where: { userId } });
    if (existingReq) {
      existingReq.status = 'approved';
      existingReq.reviewedAt = new Date();
      await this.tipsterRequestRepo.save(existingReq);
    } else {
      await this.tipsterRequestRepo.save({ userId, status: 'approved', reviewedAt: new Date() });
    }
    return { status: 'approved', message: 'You are now a tipster. Post free picks to build your ROI before selling paid coupons.' };
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

  async getMyTipsterRequest(userId: number) {
    return this.tipsterRequestRepo.findOne({ where: { userId } });
  }

  /**
   * Permanently delete the user's account. Requires password confirmation.
   * Admins cannot delete their account via this endpoint.
   * Removes tipster profile linked to this user, then deletes user (DB cascade removes wallets, tokens, etc.).
   */
  async deleteAccount(userId: number, password: string): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'role', 'password'],
    });
    if (!user) throw new BadRequestException('Account not found.');
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Admin accounts cannot be deleted from the profile page.');
    }
    const valid = await this.validatePassword(user, password);
    if (!valid) throw new BadRequestException('Current password is incorrect.');

    await this.tipsterRepo.delete({ userId });
    await this.usersRepository.delete(userId);
    return { message: 'Account deleted successfully.' };
  }
}
