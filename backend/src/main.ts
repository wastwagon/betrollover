import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { json } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { MigrationRunnerService } from './modules/admin/migration-runner.service';

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
  
  const app = await NestFactory.create(AppModule, { bodyParser: false });

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
      allowedOrigins.push(appUrl);
    }
    // Add any additional production domains from env
    const additionalOrigins = process.env.CORS_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean);
    if (additionalOrigins) {
      allowedOrigins.push(...additionalOrigins);
    }
    if (allowedOrigins.length === 0) {
      logger.warn('⚠️  No CORS origins configured for production. Set APP_URL or CORS_ORIGINS.');
    }
  } else {
    // Development: Allow localhost with specific ports
    allowedOrigins.push(
      'http://localhost:6000',
      'http://localhost:6002',
      'http://localhost:3000',
      'http://localhost:3001',
      // More restrictive regex: only common dev ports
      /^https?:\/\/localhost:(6000|6002|3000|3001|5173|8080)$/,
    );
    if (process.env.APP_URL) {
      allowedOrigins.push(process.env.APP_URL);
    }
  }
  
  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  logger.log(`CORS enabled for origins: ${isProduction ? 'Production domains' : 'Development (localhost)'}`);

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
  } catch (err: any) {
    logger.error(`Migration bootstrap failed: ${err?.message || err}`);
    if (isProduction) {
      logger.warn('API will start anyway. Go to Admin → Settings → Database migrations and click "Mark all as applied" if this DB was already migrated, then restart.');
    }
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`🚀 BetRollover API running on http://localhost:${port}`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();
