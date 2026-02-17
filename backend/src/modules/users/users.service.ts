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
      select: ['id', 'email', 'password', 'username', 'displayName', 'role', 'status'],
    });
  }

  async findByPhone(phone: string): Promise<User | null> {
    if (!phone) return null;
    return this.usersRepository.findOne({
      where: { phone },
      select: ['id', 'email', 'username', 'displayName', 'role', 'status'],
    });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      select: ['id', 'email', 'username', 'displayName', 'avatar', 'phone', 'role', 'status', 'createdAt', 'emailVerifiedAt'],
    });
  }

  async create(data: {
    email: string;
    username: string;
    password: string;
    displayName: string;
    phone?: string;
    role?: string;
  }): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 12);
    const user = this.usersRepository.create({
      email: data.email,
      username: data.username,
      password: hashedPassword,
      displayName: data.displayName || data.username,
      phone: data.phone || null,
      role: (data.role as UserRole) || UserRole.TIPSTER,
    });
    return this.usersRepository.save(user);
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    const fullUser = await this.usersRepository.findOne({
      where: { id: user.id },
      select: ['password'],
    });
    return fullUser ? bcrypt.compare(password, fullUser.password) : false;
  }

  async updateProfile(
    id: number,
    data: { displayName?: string; phone?: string; avatar?: string | null },
  ): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new Error('User not found');
    if (data.displayName !== undefined) user.displayName = data.displayName;
    if (data.phone !== undefined) user.phone = data.phone;
    if (data.avatar !== undefined) {
      user.avatar = data.avatar || null;
      await this.syncAvatarToTipster(id, user.avatar);
    }
    await this.usersRepository.save(user);
    return this.findById(id) as Promise<User>;
  }

  async uploadAvatar(userId: number, file: Express.Multer.File): Promise<User> {
    if (!file?.buffer) throw new BadRequestException('No file received');
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
    if (!user) throw new BadRequestException('User not found');
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
}
