import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { AuthModule } from './modules/auth/auth.module';
import { OtpModule } from './modules/otp/otp.module';
import { UsersModule } from './modules/users/users.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { AdminModule } from './modules/admin/admin.module';
import { FootballModule } from './modules/football/football.module';
import { FixturesModule } from './modules/fixtures/fixtures.module';
import { AccumulatorsModule } from './modules/accumulators/accumulators.module';
import { TipsterModule } from './modules/tipster/tipster.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ContentModule } from './modules/content/content.module';
import { EmailModule } from './modules/email/email.module';
import { HealthModule } from './modules/health/health.module';
import { CacheModule } from './modules/cache/cache.module';
import { PredictionsModule } from './modules/predictions/predictions.module';
import { NewsModule } from './modules/news/news.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { AdsModule } from './modules/ads/ads.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    ThrottlerModule.forRoot([
      { ttl: 60000, limit: 100 }, // Default: 100 req/min per IP
    ]),
    ScheduleModule.forRoot(),
    CacheModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      username: process.env.POSTGRES_USER || 'betrollover',
      password: process.env.POSTGRES_PASSWORD || 'betrollover_dev',
      database: process.env.POSTGRES_DB || 'betrollover',
      namingStrategy: new SnakeNamingStrategy(),
      autoLoadEntities: true,
      synchronize: false, // Schema created via database/init; use migrations for changes
      logging: process.env.NODE_ENV === 'development',
    }),
    AuthModule,
    OtpModule,
    UsersModule,
    WalletModule,
    AdminModule,
    FootballModule,
    FixturesModule,
    AccumulatorsModule,
    TipsterModule,
    NotificationsModule,
    ContentModule,
    EmailModule,
    HealthModule,
    PredictionsModule,
    NewsModule,
    ResourcesModule,
    AdsModule,
  ],
})
export class AppModule {}
