import rateLimit from 'express-rate-limit';

// The e2e suite legitimately creates far more accounts/join attempts per
// "IP" (all in-process, indistinguishable from one caller) than any real
// user would in the same window -- rate-limiting behavior itself belongs in
// its own dedicated test, not fighting every other test's fixture setup.
const skip = () => process.env.NODE_ENV === 'test';

// Generous enough to survive normal typos/retries, tight enough to make
// brute-forcing a password (or spamming account creation) impractical.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много попыток. Попробуйте позже.' },
  skip,
});

// The couple invite code is 4 chars from a 32-char alphabet (~1M
// combinations) -- without this, an attacker could brute-force the entire
// keyspace in hours and join a stranger's pairing before their real partner
// does. Keyed by IP; joining also requires an authenticated account, so this
// stacks with authLimiter's throttle on account creation.
export const joinLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много попыток. Попробуйте позже.' },
  skip,
});

// /report/generate costs real money per call (one OpenAI request) and is
// only ever reachable from the shipped app via a __DEV__-gated test button --
// in production it's not on any normal path, so this only matters as a cap
// against someone calling the route directly with a valid token.
export const generateReportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много запросов на генерацию отчёта. Попробуйте позже.' },
  skip,
});
