import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, RequestMethod } from '@nestjs/common';
import { json } from 'express';
import * as path from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { MigrationRunnerService } from './modules/admin/migration-runner.service';
import { SeedRunnerService } from './modules/admin/seed-runner.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Validate critical environment variables
  const isProduction = process.env.NODE_ENV === 'production';
  const jwtSecret = process.env.JWT_SECRET;

  if (isProduction && !jwtSecret) {
    logger.error('❌ CRITICAL: JWT_SECRET environment variable is required in production!');
    logger.error('Please set JWT_SECRET in your environment variables.');
    process.exit(1);
  }

  if (!jwtSecret) {
    logger.warn('⚠️  WARNING: JWT_SECRET not set, using default secret (NOT SECURE FOR PRODUCTION)');
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });

  // API versioning: all routes under /api/v1 except health, Paystack webhook, and Swagger docs
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'health', method: RequestMethod.ALL },
      { path: 'wallet/paystack-webhook', method: RequestMethod.POST },
      { path: 'docs', method: RequestMethod.ALL },
      { path: 'docs-json', method: RequestMethod.ALL },
      { path: 'avatars', method: RequestMethod.ALL },
    ],
  });

  // Serve uploaded avatars at /uploads/avatars
  const uploadsDir = path.join(process.cwd(), 'uploads');
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  // Security headers (Helmet) - production-safe, no breaking changes
  app.use(
    helmet({
      contentSecurityPolicy: false, // Disable CSP to avoid breaking inline scripts; add later if needed
      crossOriginEmbedderPolicy: false, // Allow external embeds (e.g. Paystack)
    }),
  );

  // Paystack webhook needs raw body for signature verification; add parsers before Nest's default
  app.use((req: Request & { rawBody?: string }, res: Response, next: NextFunction) => {
    if (req.originalUrl === '/wallet/paystack-webhook') {
      let data = '';
      req.setEncoding('utf8');
      req.on('data', (chunk: string) => { data += chunk; });
      req.on('end', () => {
        req.rawBody = data;
        try { req.body = data ? JSON.parse(data) : {}; } catch { req.body = {}; }
        next();
      });
    } else {
      next();
    }
  });
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.originalUrl !== '/wallet/paystack-webhook') {
      return json()(req, res, next);
    }
    next();
  });

  // RFC 7807–style error responses (statusCode, message, error, path, timestamp)
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global validation - less strict to avoid issues with endpoints that don't use DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Changed to false - endpoints with DTOs will still validate, but won't reject extra fields
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      skipMissingProperties: false,
      skipNullProperties: false,
      skipUndefinedProperties: false,
    }),
  );

  // CORS configuration - environment-specific
  const allowedOrigins: (string | RegExp)[] = [];

  if (isProduction) {
    // Production: Only allow specific domains
    const appUrl = process.env.APP_URL;
    if (appUrl) {
      const cleanUrl = appUrl.replace(/\/$/, '');
      allowedOrigins.push(cleanUrl);

      // Automatically add www if missing (or vice-versa)
      if (cleanUrl.includes('//www.')) {
        allowedOrigins.push(cleanUrl.replace('//www.', '//'));
      } else if (cleanUrl.includes('://')) {
        const parts = cleanUrl.split('://');
        allowedOrigins.push(`${parts[0]}://www.${parts[1]}`);
      }
    }

    // Add any additional production domains from env
    const additionalOrigins = process.env.CORS_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean);
    if (additionalOrigins) {
      additionalOrigins.forEach(origin => {
        const clean = origin.replace(/\/$/, '');
        allowedOrigins.push(clean);
        // Add www/non-www for these too
        if (clean.includes('//www.')) {
          allowedOrigins.push(clean.replace('//www.', '//'));
        } else if (clean.includes('://')) {
          const parts = clean.split('://');
          allowedOrigins.push(`${parts[0]}://www.${parts[1]}`);
        }
      });
    }

    if (allowedOrigins.length === 0) {
      logger.warn('⚠️  No CORS origins configured for production. Set APP_URL or CORS_ORIGINS.');
      logger.warn('   Example: APP_URL=https://betrollover.com (so the frontend can call the API).');
    }
  } else {
    // Development: Allow localhost with specific ports
    allowedOrigins.push(
      'http://localhost:6000',
      'http://localhost:6001',
      'http://localhost:6002',
      'http://localhost:3000',
      'http://localhost:3001',
      /^https?:\/\/localhost:(6000|6001|6002|3000|3001|5173|8080)$/,
    );
    if (process.env.APP_URL) {
      allowedOrigins.push(process.env.APP_URL.replace(/\/$/, ''));
    }
  }

  // Deduplicate origins
  const uniqueOrigins = [...new Set(allowedOrigins.map(o => (typeof o === 'string' ? o : o.toString())))];

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Session-Id',
      'X-Tipster-Id',
      'X-Requested-With',
      'Accept'
    ],
  });

  logger.log(`CORS whitelisted origins: ${uniqueOrigins.join(', ')}`);

  // Swagger API docs at /docs (additive, read-only)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('BetRollover API')
    .setDescription('BetRollover tipster marketplace API. Auth, wallet, marketplace, subscriptions, predictions.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: { persistAuthorization: true },
  });

  // Run pending DB migrations before accepting traffic (production-safe: no manual scripts)
  try {
    const migrationRunner = app.get(MigrationRunnerService);
    const result = await migrationRunner.runPending();
    if (result.applied.length > 0) {
      logger.log(`Applied ${result.applied.length} migration(s): ${result.applied.join(', ')}`);
    }
    if (result.errors.length > 0) {
      logger.error(`Migration errors: ${result.errors.join('; ')}`);
    }
    // Ensure age_verified_at and date_of_birth exist (fixes 500 on tipster-requests, impersonate)
    await migrationRunner.ensureAgeVerifiedColumn();
    await migrationRunner.ensureDateOfBirthColumn();
  } catch (err: any) {
    logger.error(`Migration bootstrap failed: ${err?.message || err}`);
    if (isProduction) {
      logger.warn('API will start anyway. Go to Admin → Settings → Database migrations and click "Mark all as applied" if this DB was already migrated, then restart.');
    }
    try {
      const migrationRunner = app.get(MigrationRunnerService);
      await migrationRunner.ensureAgeVerifiedColumn();
      await migrationRunner.ensureDateOfBirthColumn();
    } catch {
      // best-effort schema fix
    }
  }

  // Run seed data (news, resources, users, AI tipsters) - idempotent where possible
  try {
    const seedRunner = app.get(SeedRunnerService);
    const seedResult = await seedRunner.runSeeds();
    if (seedResult.run.length > 0) {
      logger.log(`Applied ${seedResult.run.length} seed(s): ${seedResult.run.join(', ')}`);
    }
    if (seedResult.errors.length > 0) {
      logger.warn(`Seed warnings (non-fatal): ${seedResult.errors.join('; ')}`);
    }
  } catch (err: any) {
    logger.warn(`Seed bootstrap failed (non-fatal): ${err?.message || err}`);
  }

  const port = process.env.PORT || 6001;
  await app.listen(port);

  logger.log(`🚀 BetRollover API running on http://localhost:${port}`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();
