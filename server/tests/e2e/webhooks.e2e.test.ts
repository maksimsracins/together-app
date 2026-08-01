import request from 'supertest';
import { app } from '../../src/app';
import { db } from '../../src/db';

function uniqueEmail(label: string) {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function signupAndLogin(name: string, label: string) {
  const email = uniqueEmail(label);
  const res = await request(app).post('/api/auth/signup').send({ name, email, password: 'password123' });
  return { token: res.body.token as string, userId: res.body.user.id as string };
}

const ORIGINAL_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;
const SECRET = 'test-webhook-secret';

beforeAll(() => {
  process.env.REVENUECAT_WEBHOOK_SECRET = SECRET;
});

afterAll(() => {
  process.env.REVENUECAT_WEBHOOK_SECRET = ORIGINAL_SECRET;
});

// `auth: null` means "send no Authorization header at all" -- using
// `undefined` for that wouldn't work here since a JS default parameter
// kicks in for an explicitly-passed `undefined` too, silently sending the
// real secret instead of omitting it.
function postWebhook(body: unknown, auth: string | null = SECRET) {
  const req = request(app).post('/api/webhooks/revenuecat');
  if (auth !== null) req.set('Authorization', auth);
  return req.send(body as object);
}

describe('POST /api/webhooks/revenuecat', () => {
  it('rejects a request with a missing or wrong Authorization header', async () => {
    const missing = await postWebhook({ event: { type: 'INITIAL_PURCHASE', app_user_id: 'x' } }, null);
    expect(missing.status).toBe(401);

    const wrong = await postWebhook({ event: { type: 'INITIAL_PURCHASE', app_user_id: 'x' } }, 'wrong-secret');
    expect(wrong.status).toBe(401);
  });

  it('acks a TEST event without requiring a resolvable app_user_id', async () => {
    const res = await postWebhook({ event: { type: 'TEST', app_user_id: 'fake_user_for_testing' } });
    expect(res.status).toBe(200);
  });

  it('rejects a malformed payload', async () => {
    const res = await postWebhook({ event: {} });
    expect(res.status).toBe(400);
  });

  it('flips Couple.isPremium on for INITIAL_PURCHASE', async () => {
    const alice = await signupAndLogin('Alice', 'webhook-purchase');
    await request(app).post('/api/couples').set('Authorization', `Bearer ${alice.token}`).send();
    const user = await db.user.findUniqueOrThrow({ where: { id: alice.userId } });
    expect(user.coupleId).not.toBeNull();

    const res = await postWebhook({ event: { type: 'INITIAL_PURCHASE', app_user_id: alice.userId } });
    expect(res.status).toBe(200);

    const couple = await db.couple.findUniqueOrThrow({ where: { id: user.coupleId! } });
    expect(couple.isPremium).toBe(true);
  });

  it('flips Couple.isPremium back off on EXPIRATION', async () => {
    const alice = await signupAndLogin('Alice', 'webhook-expire');
    await request(app).post('/api/couples').set('Authorization', `Bearer ${alice.token}`).send();
    const user = await db.user.findUniqueOrThrow({ where: { id: alice.userId } });
    await db.couple.update({ where: { id: user.coupleId! }, data: { isPremium: true } });

    const res = await postWebhook({ event: { type: 'EXPIRATION', app_user_id: alice.userId } });
    expect(res.status).toBe(200);

    const couple = await db.couple.findUniqueOrThrow({ where: { id: user.coupleId! } });
    expect(couple.isPremium).toBe(false);
  });

  it('leaves isPremium untouched on CANCELLATION (still entitled until expiry)', async () => {
    const alice = await signupAndLogin('Alice', 'webhook-cancel');
    await request(app).post('/api/couples').set('Authorization', `Bearer ${alice.token}`).send();
    const user = await db.user.findUniqueOrThrow({ where: { id: alice.userId } });
    await db.couple.update({ where: { id: user.coupleId! }, data: { isPremium: true } });

    const res = await postWebhook({ event: { type: 'CANCELLATION', app_user_id: alice.userId } });
    expect(res.status).toBe(200);

    const couple = await db.couple.findUniqueOrThrow({ where: { id: user.coupleId! } });
    expect(couple.isPremium).toBe(true);
  });

  it('acks quietly for an unknown or unpaired app_user_id', async () => {
    const alice = await signupAndLogin('Alice', 'webhook-unpaired');
    const res = await postWebhook({ event: { type: 'INITIAL_PURCHASE', app_user_id: alice.userId } });
    expect(res.status).toBe(200);

    const unknown = await postWebhook({ event: { type: 'INITIAL_PURCHASE', app_user_id: 'does-not-exist' } });
    expect(unknown.status).toBe(200);
  });
});
