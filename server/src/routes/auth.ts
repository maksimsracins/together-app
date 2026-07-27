import { Router } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db';
import { signToken } from '../auth';
import { serializeUser } from '../serializers';
import { verifyAppleIdentityToken } from '../apple';
import { authLimiter } from '../rateLimiters';

export const authRouter = Router();
authRouter.use(authLimiter);

const MAX_NAME_LENGTH = 20;
// Used to equalize bcrypt.compare timing when there's no real hash to check
// against (see /login) -- computed once at startup, matches no real password.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('no-such-user-timing-safe-placeholder', 10);

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
  // Always run a bcrypt compare, even for a nonexistent user or a
  // social-login-only account with no passwordHash -- otherwise those cases
  // return in a few ms while a real wrong-password case takes bcrypt's ~50ms+,
  // letting an attacker enumerate registered emails purely by timing.
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!user || !user.passwordHash || !valid) {
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
