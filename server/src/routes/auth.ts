import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { signToken } from '../auth';
import { serializeUser } from '../serializers';
import { verifyAppleIdentityToken } from '../apple';

export const authRouter = Router();

const MAX_NAME_LENGTH = 20;

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
  if (name.trim().length > MAX_NAME_LENGTH) {
    res.status(400).json({ error: `Имя не может быть длиннее ${MAX_NAME_LENGTH} символов` });
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

  if (!user.passwordHash) {
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

authRouter.post('/apple', async (req, res) => {
  const { identityToken, fullName } = req.body as { identityToken?: string; fullName?: string };
  if (!identityToken) {
    res.status(400).json({ error: 'identityToken обязателен' });
    return;
  }

  let payload;
  try {
    payload = await verifyAppleIdentityToken(identityToken);
  } catch {
    res.status(401).json({ error: 'Не удалось проверить Apple identity token' });
    return;
  }

  let user = await db.user.findUnique({ where: { appleId: payload.sub } });

  if (!user && payload.email) {
    const existingByEmail = await db.user.findUnique({ where: { email: payload.email.toLowerCase() } });
    if (existingByEmail) {
      user = await db.user.update({
        where: { id: existingByEmail.id },
        data: { appleId: payload.sub },
      });
    }
  }

  if (!user) {
    if (!payload.email) {
      res.status(400).json({ error: 'Apple не передал email для регистрации' });
      return;
    }
    const name = (fullName || payload.email.split('@')[0]).trim().slice(0, MAX_NAME_LENGTH) || 'Пользователь';
    user = await db.user.create({
      data: { email: payload.email.toLowerCase(), appleId: payload.sub, name },
    });
  }

  res.json({ token: signToken(user.id), user: serializeUser(user) });
});
