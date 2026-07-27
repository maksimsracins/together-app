import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// No hardcoded fallback: a guessable default secret committed in source
// would let anyone with repo access forge a valid token for any user if this
// var is ever left unset in a real deployment. Fail loud at startup instead.
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required and must not be left unset.');
}
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '90d';

export interface AuthedRequest extends Request {
  userId?: string;
}

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Missing auth token' });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
