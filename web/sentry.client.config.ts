/**
 * Sentry client-side configuration.
 * Only active when NEXT_PUBLIC_SENTRY_DSN is set. Zero impact when unset.
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    enabled: true,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
    sendDefaultPii: false,
  });
}
