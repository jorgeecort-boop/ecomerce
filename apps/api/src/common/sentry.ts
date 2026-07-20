import * as Sentry from '@sentry/node';
import { Logger } from '@nestjs/common';

let initialized = false;

export function initSentry(dsn: string | undefined, environment: string) {
  const logger = new Logger('Sentry');
  
  if (!dsn) {
    logger.warn('SENTRY_DSN not set — error monitoring disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      if (event.request?.url?.includes('/api/health')) {
        return null;
      }
      return event;
    },
    ignoreErrors: [
      /CORS blocked/,
      /Unauthorized/,
      /Invalid credentials/,
      'TokenExpiredError',
    ],
  });

  initialized = true;
  logger.log(`Sentry initialized (env: ${environment}, dsn: ${dsn.substring(0, 20)}...)`);
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!initialized) return;
  Sentry.captureException(error, { extra: context });
}

export function isSentryInitialized(): boolean {
  return initialized;
}

export { Sentry };
