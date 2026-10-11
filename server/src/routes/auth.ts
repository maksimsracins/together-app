import { Router } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db';
import { signToken } from '../auth';
import { serializeUser } from '../serializers';
import { verifyAppleIdentityToken } from '../apple';
import { authLimiter } from '../rateLimiters';
import { DEFAULT_LANG, isLang, langOf, t } from '../i18n';

export const authRouter = Router();
authRouter.use(authLimiter);

const MAX_NAME_LENGTH = 20;
// Used to equalize bcrypt.compare timing when there's no real hash to check
// against (see /login) -- computed once at startup, matches no real password.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('no-such-user-timing-safe-placeholder', 10);

authRouter.post('/signup', async (req, res) => {
  const { email, password, name, language } = req.body as {
    email?: string;
    password?: string;
    name?: string;
    language?: string;
  };
  const lang = langOf(req);

  if (!email || !password || !name) {
    res.status(400).json({ error: t(lang, 'signupFieldsRequired') });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: t(lang, 'passwordTooShort') });
    return;
  }
  if (name.trim().length > MAX_NAME_LENGTH) {
    res.status(400).json({ error: t(lang, 'nameTooLong', { max: MAX_NAME_LENGTH }) });
    return;
  }

  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    res.status(409).json({ error: t(lang, 'emailTaken') });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: { email: email.toLowerCase(), passwordHash, name, language: isLang(language) ? language : DEFAULT_LANG },
  });

  res.status(201).json({ token: signToken(user.id), user: serializeUser(user) });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  const lang = langOf(req);
  if (!email || !password) {
    res.status(400).json({ error: t(lang, 'loginFieldsRequired') });
    return;
  }

  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  // Always run a bcrypt compare, even for a nonexistent user or a
  // social-login-only account with no passwordHash -- otherwise those cases
  // return in a few ms while a real wrong-password case takes bcrypt's ~50ms+,
  // letting an attacker enumerate registered emails purely by timing.
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!user || !user.passwordHash || !valid) {
    res.status(401).json({ error: t(lang, 'invalidCredentials') });
    return;
  }

  res.json({ token: signToken(user.id), user: serializeUser(user) });
});

authRouter.post('/apple', async (req, res) => {
  const { identityToken, fullName, language } = req.body as {
    identityToken?: string;
    fullName?: string;
    language?: string;
  };
  const lang = langOf(req);
  if (!identityToken) {
    res.status(400).json({ error: t(lang, 'identityTokenRequired') });
    return;
  }

  let payload;
  try {
    payload = await verifyAppleIdentityToken(identityToken);
  } catch {
    res.status(401).json({ error: t(lang, 'appleTokenInvalid') });
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
      res.status(400).json({ error: t(lang, 'appleNoEmail') });
      return;
    }
    const name = (fullName || payload.email.split('@')[0]).trim().slice(0, MAX_NAME_LENGTH) || t(lang, 'defaultUserName');
    user = await db.user.create({
      data: {
        email: payload.email.toLowerCase(),
        appleId: payload.sub,
        name,
        language: isLang(language) ? language : DEFAULT_LANG,
      },
    });
  }

  res.json({ token: signToken(user.id), user: serializeUser(user) });
});
