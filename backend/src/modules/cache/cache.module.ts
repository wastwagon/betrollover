import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        
        if (redisUrl) {
          // Use Redis if configured
          const url = new URL(redisUrl);
          return {
            store: redisStore,
            host: url.hostname || 'redis',
            port: parseInt(url.port || '6379', 10),
            ttl: 300, // 5 minutes
          };
        }
        
        // Fallback to in-memory cache
        return {
          ttl: 300, // 5 minutes
          max: 1000, // Max items
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [NestCacheModule],
})
export class CacheModule {}
