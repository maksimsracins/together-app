import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { couplesRouter } from './routes/couples';
import { entriesRouter } from './routes/entries';
import { reportRouter } from './routes/report';
import { notificationsRouter } from './routes/notifications';

export const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRouter);
app.use('/api', usersRouter);
app.use('/api/couples', couplesRouter);
app.use('/api/entries', entriesRouter);
app.use('/api/report', reportRouter);
app.use('/api/notifications', notificationsRouter);
