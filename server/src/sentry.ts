import * as Sentry from '@sentry/node';

// No-op with no DSN configured (e.g. local dev) -- error tracking is opt-in
// via env var, never required to run the server.
export function initSentry() {
  if (!process.env.SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.1,
  });
}

export { Sentry };

// Most errors in this codebase happen in fire-and-forget background work
// (notifications, the report scheduler) that never touches the Express
// error handler -- console.error alone means they're only ever seen by
// whoever happens to be tailing logs at that moment.
export function logError(message: string, err: unknown) {
  console.error(message, err);
  Sentry.captureException(err, { extra: { message } });
}
