import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import { Sentry } from './sentry';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { couplesRouter } from './routes/couples';
import { entriesRouter } from './routes/entries';
import { reportRouter } from './routes/report';
import { notificationsRouter } from './routes/notifications';
import { webhooksRouter } from './routes/webhooks';

export const app = express();
app.use(helmet());
// Native mobile clients (this app's actual consumer) don't send an Origin
// header and aren't subject to CORS at all -- this only matters for a
// browser-based consumer (react-native-web is a dependency, so one could
// exist). Defaults to open (current behavior) unless CORS_ORIGIN is set to a
// comma-separated allowlist, so locking this down in production needs only
// an env var, not a code change.
const corsOrigin = process.env.CORS_ORIGIN?.split(',');
app.use(cors(corsOrigin ? { origin: corsOrigin } : undefined));
app.use(express.json({ limit: '6mb' })); // entry photos ride along as base64 in the JSON body

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// `public/` sits next to both src/ and dist/ (one level under server/), so
// this resolves the same way whether running from source (tsx) or the
// compiled build -- no separate copy-to-dist build step needed.
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
app.get('/privacy', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'privacy.html')));
app.get('/terms', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'terms.html')));
app.get('/support', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'support.html')));

// webhooksRouter must be registered before usersRouter -- usersRouter is
// mounted at bare `/api` (with its own requireAuth), which would otherwise
// match and intercept `/api/webhooks/*` first since Express dispatches by
// registration order + path prefix, not by specificity.
app.use('/api/webhooks', webhooksRouter);
app.use('/api/auth', authRouter);
app.use('/api', usersRouter);
app.use('/api/couples', couplesRouter);
app.use('/api/entries', entriesRouter);
app.use('/api/report', reportRouter);
app.use('/api/notifications', notificationsRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Last resort for anything that throws without being caught by its own route
// handler (a malformed body, an unexpected Prisma error, etc). Without this,
// Express's default handler replies with a full stack trace -- absolute file
// paths, dependency internals -- to any client, regardless of NODE_ENV.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error', err);
  Sentry.captureException(err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Internal server error' });
});
