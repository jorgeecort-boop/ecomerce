import * as Sentry from '@sentry/node';

let initialized = false;

export function initSentry(dsn: string | undefined, environment: string) {
  if (!dsn) {
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
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!initialized) return;
  Sentry.captureException(error, { extra: context });
}

export function isSentryInitialized(): boolean {
  return initialized;
}

export { Sentry };
