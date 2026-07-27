import request from 'supertest';

jest.mock('../../src/apple', () => ({
  verifyAppleIdentityToken: jest.fn(),
}));

import { app } from '../../src/app';
import { db } from '../../src/db';
import { verifyAppleIdentityToken } from '../../src/apple';

const mockVerify = verifyAppleIdentityToken as jest.Mock;

function uniqueEmail(label: string) {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

beforeEach(() => {
  mockVerify.mockReset();
});

describe('POST /api/auth/apple', () => {
  it('rejects a request with no identityToken', async () => {
    const res = await request(app).post('/api/auth/apple').send({});
    expect(res.status).toBe(400);
  });

  it('rejects a token that fails verification', async () => {
    mockVerify.mockRejectedValue(new Error('bad token'));
    const res = await request(app).post('/api/auth/apple').send({ identityToken: 'whatever' });
    expect(res.status).toBe(401);
  });

  it('creates a new user on first sign-in, using the provided fullName', async () => {
    const email = uniqueEmail('apple-new');
    mockVerify.mockResolvedValue({ sub: 'apple-sub-1', email });

    const res = await request(app)
      .post('/api/auth/apple')
      .send({ identityToken: 'tok', fullName: 'Jamie Fraser' });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe(email.toLowerCase());
    expect(res.body.user.name).toBe('Jamie Fraser');

    const stored = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    expect(stored?.appleId).toBe('apple-sub-1');
    expect(stored?.passwordHash).toBeNull();
  });

  it('falls back to the email prefix as a name when fullName is absent', async () => {
    const email = uniqueEmail('apple-noname');
    mockVerify.mockResolvedValue({ sub: 'apple-sub-2', email });

    const res = await request(app).post('/api/auth/apple').send({ identityToken: 'tok' });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe(email.split('@')[0].slice(0, 20));
  });

  it('truncates an overly long fullName to 20 characters', async () => {
    const email = uniqueEmail('apple-longname');
    mockVerify.mockResolvedValue({ sub: 'apple-sub-3', email });

    const longName = 'A'.repeat(40);
    const res = await request(app).post('/api/auth/apple').send({ identityToken: 'tok', fullName: longName });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toHaveLength(20);
  });

  it('rejects account creation when Apple provides no email and no account exists yet', async () => {
    mockVerify.mockResolvedValue({ sub: 'apple-sub-4' });
    const res = await request(app).post('/api/auth/apple').send({ identityToken: 'tok' });
    expect(res.status).toBe(400);
  });

  it('logs a returning user in by appleId alone (no email on repeat sign-in)', async () => {
    const email = uniqueEmail('apple-returning');
    mockVerify.mockResolvedValue({ sub: 'apple-sub-5', email });
    const first = await request(app).post('/api/auth/apple').send({ identityToken: 'tok', fullName: 'Returning User' });
    expect(first.status).toBe(200);
    const userId = first.body.user.id;

    // Apple only sends email/fullName on the very first sign-in.
    mockVerify.mockResolvedValue({ sub: 'apple-sub-5' });
    const second = await request(app).post('/api/auth/apple').send({ identityToken: 'tok2' });
    expect(second.status).toBe(200);
    expect(second.body.user.id).toBe(userId);
    expect(second.body.user.name).toBe('Returning User');

    const count = await db.user.count({ where: { email: email.toLowerCase() } });
    expect(count).toBe(1);
  });

  it('links Apple sign-in to an existing password account with the same email', async () => {
    const email = uniqueEmail('apple-link');
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Existing User', email, password: 'password123' });
    const existingId = signupRes.body.user.id;

    mockVerify.mockResolvedValue({ sub: 'apple-sub-6', email });
    const appleRes = await request(app).post('/api/auth/apple').send({ identityToken: 'tok' });
    expect(appleRes.status).toBe(200);
    expect(appleRes.body.user.id).toBe(existingId);
    expect(appleRes.body.user.name).toBe('Existing User');

    const stored = await db.user.findUnique({ where: { id: existingId } });
    expect(stored?.appleId).toBe('apple-sub-6');

    // The now-linked account can still log in with its original password too.
    const loginRes = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
    expect(loginRes.status).toBe(200);
  });

  it('does not create a duplicate user if the same appleId signs in twice concurrently-ish', async () => {
    const email = uniqueEmail('apple-nodupe');
    mockVerify.mockResolvedValue({ sub: 'apple-sub-7', email });
    await request(app).post('/api/auth/apple').send({ identityToken: 'tok' });
    await request(app).post('/api/auth/apple').send({ identityToken: 'tok' });

    const count = await db.user.count({ where: { appleId: 'apple-sub-7' } });
    expect(count).toBe(1);
  });
});
