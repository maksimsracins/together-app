import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { db } from '../db';
import { signToken } from '../auth';
import { serializeUser } from '../serializers';
import { verifyAppleIdentityToken } from '../apple';
import { authLimiter } from '../rateLimiters';
import { DEFAULT_LANG, isLang, langOf, normalizeLang, t } from '../i18n';
import { sendMail } from '../mailer';

export const authRouter = Router();
authRouter.use(authLimiter);

const MAX_NAME_LENGTH = 20;
// Used to equalize bcrypt.compare timing when there's no real hash to check
// against (see /login) -- computed once at startup, matches no real password.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('no-such-user-timing-safe-placeholder', 10);
const RESET_CODE_TTL_MINUTES = 15;
const RESET_CODE_MAX_ATTEMPTS = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// One account per address: " Anna@Mail.com" and "anna@mail.com" must be the
// same key everywhere an email is stored or looked up.
function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isUniqueViolation(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

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
  const normalizedEmail = normalizeEmail(email);
  if (!EMAIL_RE.test(normalizedEmail)) {
    res.status(400).json({ error: t(lang, 'emailInvalid') });
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

  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    res.status(409).json({ error: t(lang, 'emailTaken') });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  let user;
  try {
    user = await db.user.create({
      data: { email: normalizedEmail, passwordHash, name, language: isLang(language) ? language : DEFAULT_LANG },
    });
  } catch (err) {
    // Two signups for the same address racing past the check above.
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: t(lang, 'emailTaken') });
      return;
    }
    throw err;
  }

  res.status(201).json({ token: signToken(user.id), user: serializeUser(user) });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  const lang = langOf(req);
  if (!email || !password) {
    res.status(400).json({ error: t(lang, 'loginFieldsRequired') });
    return;
  }

  const user = await db.user.findUnique({ where: { email: normalizeEmail(email) } });
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
    const existingByEmail = await db.user.findUnique({ where: { email: normalizeEmail(payload.email) } });
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
        email: normalizeEmail(payload.email),
        appleId: payload.sub,
        name,
        language: isLang(language) ? language : DEFAULT_LANG,
      },
    });
  }

  res.json({ token: signToken(user.id), user: serializeUser(user) });
});

// Step 1 of "forgot password": email a short-lived 6-digit code. Always
// answers 204, whether or not the address is registered, so this can't be
// used to find out who has an account.
authRouter.post('/forgot-password', async (req, res) => {
  const { email } = req.body as { email?: string };
  const lang = langOf(req);
  if (!email || !EMAIL_RE.test(normalizeEmail(email))) {
    res.status(400).json({ error: t(lang, 'emailInvalid') });
    return;
  }

  const user = await db.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (user) {
    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordResetCodeHash: await bcrypt.hash(code, 10),
        passwordResetExpiresAt: new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60 * 1000),
        passwordResetAttempts: 0,
      },
    });
    const userLang = normalizeLang(user.language);
    try {
      await sendMail(
        user.email,
        t(userLang, 'resetEmailSubject'),
        t(userLang, 'resetEmailBody', { code, minutes: RESET_CODE_TTL_MINUTES })
      );
    } catch (err) {
      console.error('Failed to send password reset email', err);
    }
  }

  res.status(204).send();
});

// Step 2: trade the emailed code for a new password, and sign in. Also lets a
// Sign-in-with-Apple account add a password.
authRouter.post('/reset-password', async (req, res) => {
  const { email, code, password } = req.body as { email?: string; code?: string; password?: string };
  const lang = langOf(req);
  if (!email || !code || !password) {
    res.status(400).json({ error: t(lang, 'resetFieldsRequired') });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: t(lang, 'passwordTooShort') });
    return;
  }

  const user = await db.user.findUnique({ where: { email: normalizeEmail(email) } });
  const usable =
    !!user?.passwordResetCodeHash &&
    !!user.passwordResetExpiresAt &&
    user.passwordResetExpiresAt.getTime() > Date.now() &&
    user.passwordResetAttempts < RESET_CODE_MAX_ATTEMPTS;
  // Same timing-equalization idea as /login.
  const valid = await bcrypt.compare(code.trim(), usable ? user!.passwordResetCodeHash! : DUMMY_PASSWORD_HASH);
  if (!user || !usable || !valid) {
    if (user && usable) {
      await db.user.update({ where: { id: user.id }, data: { passwordResetAttempts: { increment: 1 } } });
    }
    res.status(400).json({ error: t(lang, 'resetCodeInvalid') });
    return;
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(password, 10),
      passwordResetCodeHash: null,
      passwordResetExpiresAt: null,
      passwordResetAttempts: 0,
    },
  });

  res.json({ token: signToken(updated.id), user: serializeUser(updated) });
});
