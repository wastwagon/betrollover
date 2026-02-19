import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  USER = 'user',
  TIPSTER = 'tipster',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  username: string;

  @Column({ length: 100, unique: true })
  email: string;

  @Column({ length: 255, select: false })
  password: string;

  @Column({ length: 100 })
  displayName: string;

  @Column('varchar', { length: 255, nullable: true })
  avatar: string | null = null;

  @Column({ type: 'varchar', length: 20, default: 'user' })
  role: UserRole;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: UserStatus;

  @Column('varchar', { length: 20, nullable: true })
  phone: string | null = null;

  @Column({ length: 50, default: 'Ghana' })
  country: string;

  @Column({ length: 50, default: 'Africa/Accra' })
  timezone: string;

  @Column({ type: 'timestamp', nullable: true })
  lastLogin: Date | null = null;

  @Column({ length: 3, default: 'GHA' })
  countryCode: string;

  @Column({ length: 10, default: '🇬🇭' })
  flagEmoji: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  emailVerifiedAt: Date | null = null;

  @Column({ type: 'varchar', length: 64, nullable: true, select: false })
  emailVerificationToken: string | null = null;

  @Column({ default: true })
  emailNotifications: boolean;

  @Column({ default: false })
  pushNotifications: boolean;

  @Column('text', { nullable: true })
  bio: string | null = null;

  @Column('date', { nullable: true })
  dateOfBirth: Date | null = null;

  @Column('timestamp', { nullable: true })
  ageVerifiedAt: Date | null = null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
