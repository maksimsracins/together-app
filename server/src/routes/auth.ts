import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { signToken } from '../auth';
import { serializeUser } from '../serializers';

export const authRouter = Router();

authRouter.post('/signup', async (req, res) => {
  const { email, password, name } = req.body as { email?: string; password?: string; name?: string };

  if (!email || !password || !name) {
    res.status(400).json({ error: 'email, password и name обязательны' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Пароль должен быть не короче 6 символов' });
    return;
  }

  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    res.status(409).json({ error: 'Пользователь с таким email уже существует' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: { email: email.toLowerCase(), passwordHash, name },
  });

  res.status(201).json({ token: signToken(user.id), user: serializeUser(user) });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: 'email и password обязательны' });
    return;
  }

  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    res.status(401).json({ error: 'Неверный email или пароль' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Неверный email или пароль' });
    return;
  }

  res.json({ token: signToken(user.id), user: serializeUser(user) });
});
