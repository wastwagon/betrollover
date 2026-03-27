import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, RequestMethod } from '@nestjs/common';
import { json } from 'express';
import * as path from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { MigrationRunnerService } from './modules/admin/migration-runner.service';
import { SeedRunnerService } from './modules/admin/seed-runner.service';

function validateConfig(logger: Logger): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const requiredInProd: { key: string; message?: string }[] = [
    { key: 'JWT_SECRET', message: 'Required for signing tokens. Set a strong random value (32+ chars).' },
    { key: 'APP_URL', message: 'Frontend origin for CORS (e.g. https://betrollover.com). API must allow this origin.' },
  ];
  if (!isProduction) return;
  const missing: string[] = [];
  for (const { key, message } of requiredInProd) {
    const val = process.env[key];
    if (!val || String(val).trim() === '') {
      missing.push(message ? `${key}: ${message}` : key);
    }
  }
  if (missing.length > 0) {
    logger.error('❌ Production config validation failed. Missing or empty:');
    missing.forEach(m => logger.error(`   - ${m}`));
    logger.error('Set these in your environment and restart.');
    process.exit(1);
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Validate critical environment variables (production: fail fast with clear message)
  const isProduction = process.env.NODE_ENV === 'production';
  const jwtSecret = process.env.JWT_SECRET;

  if (isProduction && !jwtSecret) {
    logger.error('❌ CRITICAL: JWT_SECRET environment variable is required in production!');
    logger.error('Please set JWT_SECRET in your environment variables.');
    process.exit(1);
  }

  const appUrlRaw = process.env.APP_URL?.trim();
  if (isProduction && appUrlRaw) {
    try {
      const u = new URL(appUrlRaw);
      if (u.hostname.startsWith('api.')) {
        logger.error(
          '❌ APP_URL must be the frontend origin (e.g. https://betrollover.com), not the API host. ' +
            'If APP_URL is set to api.*, browsers sending Origin: https://betrollover.com will get CORS failures.',
        );
        process.exit(1);
      }
    } catch {
      logger.error('❌ APP_URL is not a valid URL. Use e.g. https://betrollover.com');
      process.exit(1);
    }
  }

  if (!jwtSecret) {
    logger.warn('⚠️  WARNING: JWT_SECRET not set, using default secret (NOT SECURE FOR PRODUCTION)');
  }

  validateConfig(logger);

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
      crossOriginOpenerPolicy: false, // Allow Google Sign-In / OAuth popups (postMessage)
      // Default CORP can interfere with cross-origin fetches; CORS already governs API access.
      crossOriginResourcePolicy: false,
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
  // Filter registered via APP_FILTER in AppModule for DI (AnalyticsService)

  // Global validation — strip unknown fields always; reject them in production
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: isProduction,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      skipMissingProperties: false,
      skipNullProperties: false,
      skipUndefinedProperties: false,
    }),
  );

  // CORS: APP_URL + CORS_ORIGINS (comma-separated) in every environment; www/non-www variants included.
  // Production must have at least one origin string after merge (validateConfig already requires APP_URL).
  const allowedOrigins: (string | RegExp)[] = [];

  const addOriginWithWwwVariants = (raw: string) => {
    const clean = raw.replace(/\/$/, '');
    if (!clean) return;
    allowedOrigins.push(clean);
    if (clean.includes('//www.')) {
      allowedOrigins.push(clean.replace('//www.', '//'));
    } else if (clean.includes('://')) {
      const parts = clean.split('://');
      allowedOrigins.push(`${parts[0]}://www.${parts[1]}`);
    }
  };

  if (isProduction) {
    const appUrl = process.env.APP_URL?.trim();
    if (appUrl) addOriginWithWwwVariants(appUrl);
  } else {
    allowedOrigins.push(
      'http://localhost:6000',
      'http://localhost:6001',
      'http://localhost:6002',
      'http://localhost:3000',
      'http://localhost:3001',
      /^https?:\/\/localhost:(6000|6001|6002|3000|3001|5173|8080)$/,
    );
    const devAppUrl = process.env.APP_URL?.trim();
    if (devAppUrl) addOriginWithWwwVariants(devAppUrl);
  }

  const extraOrigins = process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) ?? [];
  extraOrigins.forEach((o) => addOriginWithWwwVariants(o));

  const stringOriginCount = allowedOrigins.filter((o) => typeof o === 'string').length;
  if (isProduction && stringOriginCount === 0) {
    logger.error(
      '❌ No CORS origins in production. Set APP_URL to your frontend origin (e.g. https://betrollover.com) and/or CORS_ORIGINS.',
    );
    process.exit(1);
  }

  const uniqueStringOrigins = [...new Set(allowedOrigins.filter((o): o is string => typeof o === 'string'))];

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
      'Accept',
      'Accept-Language',
      'sentry-trace',
      'baggage',
    ],
    maxAge: 86400,
  });

  logger.log(
    `CORS whitelisted origins: ${uniqueStringOrigins.join(', ')}` +
      (!isProduction ? ' (+ localhost port regex)' : ''),
  );

  // Swagger API docs at /docs — disabled in production to avoid exposing API schema
  if (!isProduction) {
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
  }

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
    // Ensure age_verified_at, date_of_birth, team logos/country codes exist
    await migrationRunner.ensureAgeVerifiedColumn();
    await migrationRunner.ensureDateOfBirthColumn();
    await migrationRunner.ensureTeamLogoAndCountryColumns();
    await migrationRunner.ensureSubscriptionEscrowAuditColumns();
  } catch (err: any) {
    logger.error(`Migration bootstrap failed: ${err?.message || err}`);
    if (isProduction) {
      logger.warn('API will start anyway. Go to Admin → Settings → Database migrations and click "Mark all as applied" if this DB was already migrated, then restart.');
    }
    try {
      const migrationRunner = app.get(MigrationRunnerService);
      await migrationRunner.ensureAgeVerifiedColumn();
      await migrationRunner.ensureDateOfBirthColumn();
      await migrationRunner.ensureTeamLogoAndCountryColumns();
      await migrationRunner.ensureSubscriptionEscrowAuditColumns();
    } catch {
      // best-effort schema fix
    }
  }

  // Run seed data (news, resources, users, AI tipsters) - idempotent where possible.
  // In production we skip seeds on startup so that admin-deleted users/tipsters stay deleted after deploy.
  // For fresh production DB, run seed SQL once manually or set RUN_SEEDS_ON_STARTUP=true for initial deploy only.
  const runSeedsOnStartup =
    process.env.RUN_SEEDS_ON_STARTUP === 'true' ||
    (process.env.NODE_ENV !== 'production' && process.env.RUN_SEEDS_ON_STARTUP !== 'false');
  if (runSeedsOnStartup) {
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
  } else {
    logger.log('Seeds skipped on startup (production or RUN_SEEDS_ON_STARTUP=false). Deleted users/tipsters will not be re-inserted.');
  }

  const port = process.env.PORT || 6001;
  await app.listen(port);

  logger.log(`🚀 BetRollover API running on http://localhost:${port}`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();
