import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
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
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { PushModule } from './modules/push/push.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AvatarsModule } from './modules/avatars/avatars.module';
import { SportEventsModule } from './modules/sport-events/sport-events.module';
import { BasketballModule } from './modules/basketball/basketball.module';
import { RugbyModule } from './modules/rugby/rugby.module';
import { MmaModule } from './modules/mma/mma.module';
import { VolleyballModule } from './modules/volleyball/volleyball.module';
import { HockeyModule } from './modules/hockey/hockey.module';
import { AmericanFootballModule } from './modules/american-football/american-football.module';
import { TennisModule } from './modules/tennis/tennis.module';
import { OddsApiModule } from './modules/odds-api/odds-api.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { SupportModule } from './modules/support/support.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { ChatModule } from './modules/chat/chat.module';

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
      extra: {
        max: parseInt(process.env.DB_POOL_MAX || '20', 10),
        idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10),
      },
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
    SubscriptionsModule,
    PushModule,
    AvatarsModule,
    SportEventsModule,
    BasketballModule,
    RugbyModule,
    MmaModule,
    VolleyballModule,
    HockeyModule,
    AmericanFootballModule,
    TennisModule,
    OddsApiModule,
    ReviewsModule,
    SupportModule,
    ReferralsModule,
    ChatModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
