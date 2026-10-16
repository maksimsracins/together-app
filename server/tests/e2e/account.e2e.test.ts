import request from 'supertest';
import { app } from '../../src/app';
import { db } from '../../src/db';
import { sendMail } from '../../src/mailer';

jest.mock('../../src/mailer', () => ({ sendMail: jest.fn().mockResolvedValue(undefined) }));
const sendMailMock = sendMail as jest.MockedFunction<typeof sendMail>;

function uniqueEmail(label: string) {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function signup(email = uniqueEmail('acct'), password = 'password123') {
  const res = await request(app).post('/api/auth/signup').send({ name: 'Ann', email, password });
  return { token: res.body.token as string, email, password };
}

function lastEmailedCode() {
  const body = sendMailMock.mock.calls.at(-1)![2];
  return body.match(/\d{6}/)![0];
}

beforeEach(() => sendMailMock.mockClear());

describe('one account per email', () => {
  it('treats case and surrounding spaces as the same address', async () => {
    const email = uniqueEmail('Case');
    await signup(email);
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Ann2', email: `  ${email.toUpperCase()} `, password: 'password123' });
    expect(res.status).toBe(409);
  });

  it('rejects a malformed email', async () => {
    const res = await request(app).post('/api/auth/signup').send({ name: 'Ann', email: 'not-an-email', password: 'password123' });
    expect(res.status).toBe(400);
  });

  it('returns 409, not 500, when two signups race for the same address', async () => {
    const email = uniqueEmail('race');
    const results = await Promise.all(
      [1, 2, 3].map(() => request(app).post('/api/auth/signup').send({ name: 'Ann', email, password: 'password123' }))
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 409, 409]);
  });
});

describe('language change limit', () => {
  it('allows 3 changes per day, then rejects', async () => {
    const { token } = await signup();
    const auth = { Authorization: `Bearer ${token}` };
    for (const language of ['lv', 'en', 'ru']) {
      const res = await request(app).patch('/api/me').set(auth).send({ language });
      expect(res.status).toBe(200);
      expect(res.body.language).toBe(language);
    }
    const blocked = await request(app).patch('/api/me').set(auth).send({ language: 'en' });
    expect(blocked.status).toBe(429);

    // Re-sending the current language isn't a change and isn't counted.
    const same = await request(app).patch('/api/me').set(auth).send({ language: 'ru' });
    expect(same.status).toBe(200);
  });
});

describe('forgot password', () => {
  it('answers 204 for unknown emails without sending anything', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: uniqueEmail('ghost') });
    expect(res.status).toBe(204);
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('resets the password with the emailed code and signs in', async () => {
    const { email } = await signup();
    expect((await request(app).post('/api/auth/forgot-password').send({ email })).status).toBe(204);
    const code = lastEmailedCode();

    const res = await request(app).post('/api/auth/reset-password').send({ email, code, password: 'newpass123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));

    expect((await request(app).post('/api/auth/login').send({ email, password: 'password123' })).status).toBe(401);
    expect((await request(app).post('/api/auth/login').send({ email, password: 'newpass123' })).status).toBe(200);

    // A code works only once.
    const reuse = await request(app).post('/api/auth/reset-password').send({ email, code, password: 'another123' });
    expect(reuse.status).toBe(400);
  });

  it('rejects wrong codes and locks the code after 5 attempts', async () => {
    const { email } = await signup();
    await request(app).post('/api/auth/forgot-password').send({ email });
    const code = lastEmailedCode();
    const wrong = code === '000000' ? '111111' : '000000';

    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/api/auth/reset-password').send({ email, code: wrong, password: 'newpass123' });
      expect(res.status).toBe(400);
    }
    const res = await request(app).post('/api/auth/reset-password').send({ email, code, password: 'newpass123' });
    expect(res.status).toBe(400);
  });

  it('rejects an expired code', async () => {
    const { email } = await signup();
    await request(app).post('/api/auth/forgot-password').send({ email });
    const code = lastEmailedCode();
    await db.user.update({ where: { email }, data: { passwordResetExpiresAt: new Date(Date.now() - 1000) } });

    const res = await request(app).post('/api/auth/reset-password').send({ email, code, password: 'newpass123' });
    expect(res.status).toBe(400);
  });
});
