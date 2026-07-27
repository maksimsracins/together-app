import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { couplesRouter } from './routes/couples';
import { entriesRouter } from './routes/entries';
import { reportRouter } from './routes/report';
import { notificationsRouter } from './routes/notifications';

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
  if (res.headersSent) return;
  res.status(500).json({ error: 'Internal server error' });
});
