import request from 'supertest';
import { app } from '../../src/app';

function uniqueEmail(label: string) {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function signup(name: string, emailLabel: string, password = 'password123') {
  const email = uniqueEmail(emailLabel);
  const res = await request(app).post('/api/auth/signup').send({ name, email, password });
  return { res, email, password };
}

describe('auth', () => {
  it('rejects signup with missing fields', async () => {
    const res = await request(app).post('/api/auth/signup').send({ email: uniqueEmail('a') });
    expect(res.status).toBe(400);
  });

  it('rejects signup with a too-short password', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Ann', email: uniqueEmail('a'), password: '123' });
    expect(res.status).toBe(400);
  });

  it('signs up a new user and returns a token', async () => {
    const { res } = await signup('Ann', 'ann');
    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toEqual(expect.any(String));
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects signup with a duplicate email', async () => {
    const email = uniqueEmail('dup');
    await request(app).post('/api/auth/signup').send({ name: 'Ann', email, password: 'password123' });
    const res = await request(app).post('/api/auth/signup').send({ name: 'Ann2', email, password: 'password123' });
    expect(res.status).toBe(409);
  });

  it('logs in with correct credentials and rejects incorrect ones', async () => {
    const { email, password } = await signup('Ann', 'login').then((r) => r);

    const wrongPassword = await request(app).post('/api/auth/login').send({ email, password: 'wrongpass' });
    expect(wrongPassword.status).toBe(401);

    const unknownEmail = await request(app).post('/api/auth/login').send({ email: uniqueEmail('nope'), password });
    expect(unknownEmail.status).toBe(401);

    const ok = await request(app).post('/api/auth/login').send({ email, password });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toEqual(expect.any(String));
    expect(ok.body.user.email).toBe(email);
  });

  it('rejects protected routes without a token', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
  });
});

describe('sharing an invite code between two users', () => {
  async function signupAndLogin(name: string, label: string) {
    const { res, email, password } = await signup(name, label);
    expect(res.status).toBe(201);
    return { token: res.body.token as string, userId: res.body.user.id as string, email, password };
  }

  it('lets a second user join the first user’s couple via the invite code', async () => {
    const alice = await signupAndLogin('Alice', 'alice');
    const bob = await signupAndLogin('Bob', 'bob');

    const createRes = await request(app)
      .post('/api/couples')
      .set('Authorization', `Bearer ${alice.token}`)
      .send();
    expect(createRes.status).toBe(201);
    const inviteCode = createRes.body.inviteCode as string;
    expect(inviteCode).toMatch(/^LOVE-[A-Z0-9]{4}$/);

    const joinRes = await request(app)
      .post('/api/couples/join')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ code: inviteCode.toLowerCase() });
    expect(joinRes.status).toBe(200);
    expect(joinRes.body.inviteCode).toBe(inviteCode);

    const aliceMe = await request(app).get('/api/me').set('Authorization', `Bearer ${alice.token}`);
    const bobMe = await request(app).get('/api/me').set('Authorization', `Bearer ${bob.token}`);
    expect(aliceMe.body.coupleId).toBe(joinRes.body.id);
    expect(bobMe.body.coupleId).toBe(joinRes.body.id);

    const alicePartner = await request(app)
      .get('/api/me/partner')
      .set('Authorization', `Bearer ${alice.token}`);
    expect(alicePartner.body.id).toBe(bob.userId);

    const bobPartner = await request(app).get('/api/me/partner').set('Authorization', `Bearer ${bob.token}`);
    expect(bobPartner.body.id).toBe(alice.userId);
  });

  it('rejects joining with an unknown invite code', async () => {
    const bob = await signupAndLogin('Bob', 'bob-badcode');
    const res = await request(app)
      .post('/api/couples/join')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ code: 'LOVE-ZZZZ' });
    expect(res.status).toBe(404);
  });

  it('is idempotent when the same user joins twice', async () => {
    const alice = await signupAndLogin('Alice', 'alice-idem');
    const bob = await signupAndLogin('Bob', 'bob-idem');

    const { body: couple } = await request(app)
      .post('/api/couples')
      .set('Authorization', `Bearer ${alice.token}`)
      .send();

    await request(app)
      .post('/api/couples/join')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ code: couple.inviteCode });

    const secondJoin = await request(app)
      .post('/api/couples/join')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ code: couple.inviteCode });
    expect(secondJoin.status).toBe(200);
    expect(secondJoin.body.id).toBe(couple.id);
  });

  it('rejects a third user joining a couple that already has two members', async () => {
    const alice = await signupAndLogin('Alice', 'alice-full');
    const bob = await signupAndLogin('Bob', 'bob-full');
    const carol = await signupAndLogin('Carol', 'carol-full');

    const { body: couple } = await request(app)
      .post('/api/couples')
      .set('Authorization', `Bearer ${alice.token}`)
      .send();

    await request(app)
      .post('/api/couples/join')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ code: couple.inviteCode });

    const carolJoin = await request(app)
      .post('/api/couples/join')
      .set('Authorization', `Bearer ${carol.token}`)
      .send({ code: couple.inviteCode });
    expect(carolJoin.status).toBe(409);
  });

  it('dissolves the couple for both members when either one leaves', async () => {
    const alice = await signupAndLogin('Alice', 'alice-leave');
    const bob = await signupAndLogin('Bob', 'bob-leave');
    const carol = await signupAndLogin('Carol', 'carol-leave');

    const { body: couple } = await request(app)
      .post('/api/couples')
      .set('Authorization', `Bearer ${alice.token}`)
      .send();
    await request(app)
      .post('/api/couples/join')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ code: couple.inviteCode });

    const leaveRes = await request(app)
      .post('/api/couples/leave')
      .set('Authorization', `Bearer ${bob.token}`)
      .send();
    expect(leaveRes.status).toBe(204);

    const bobMe = await request(app).get('/api/me').set('Authorization', `Bearer ${bob.token}`);
    expect(bobMe.body.coupleId).toBeNull();

    // Alice didn't initiate the leave, but she should be freed too — the
    // pairing dissolves for both sides, not just the one who tapped "leave".
    const aliceMe = await request(app).get('/api/me').set('Authorization', `Bearer ${alice.token}`);
    expect(aliceMe.body.coupleId).toBeNull();

    const alicePartner = await request(app)
      .get('/api/me/partner')
      .set('Authorization', `Bearer ${alice.token}`);
    expect(alicePartner.body).toBeNull();

    const { body: carolCouple } = await request(app)
      .post('/api/couples')
      .set('Authorization', `Bearer ${carol.token}`)
      .send();
    const bobJoinsCarol = await request(app)
      .post('/api/couples/join')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ code: carolCouple.inviteCode });
    expect(bobJoinsCarol.status).toBe(200);
  });

  it('rejects leaving when not in a couple', async () => {
    const dave = await signupAndLogin('Dave', 'dave-leave');
    const res = await request(app)
      .post('/api/couples/leave')
      .set('Authorization', `Bearer ${dave.token}`)
      .send();
    expect(res.status).toBe(400);
  });

  // Regression test: GET /api/couples/settings used to call ensureCoupleContext,
  // which silently auto-created and assigned a brand-new couple to any
  // coupleless user who merely loaded a screen that reads settings (e.g. the
  // Home tab, on every app launch). That made "leave, then reconnect" look
  // like the user was already paired again, with no partner and no way out
  // except discovering the bug.
  it('never re-enrolls a coupleless user into a couple just by reading settings', async () => {
    const alice = await signupAndLogin('Alice', 'alice-settings-noop');
    const bob = await signupAndLogin('Bob', 'bob-settings-noop');

    const { body: couple } = await request(app)
      .post('/api/couples')
      .set('Authorization', `Bearer ${alice.token}`)
      .send();
    await request(app)
      .post('/api/couples/join')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ code: couple.inviteCode });
    await request(app)
      .post('/api/couples/leave')
      .set('Authorization', `Bearer ${bob.token}`)
      .send();

    // Simulate Bob's Home tab loading settings after leaving.
    const settingsRes = await request(app)
      .get('/api/couples/settings')
      .set('Authorization', `Bearer ${bob.token}`);
    expect(settingsRes.status).toBe(200);
    expect(settingsRes.body).toMatchObject({
      reportWeekday: 1,
      reportHour: 9,
      coupleCreatedAt: null,
      lastReportAt: null,
    });

    const bobMe = await request(app).get('/api/me').set('Authorization', `Bearer ${bob.token}`);
    expect(bobMe.body.coupleId).toBeNull();

    // Bob must still be able to create a fresh couple — nothing already claimed it.
    const newCoupleRes = await request(app)
      .post('/api/couples')
      .set('Authorization', `Bearer ${bob.token}`)
      .send();
    expect(newCoupleRes.status).toBe(201);
    expect(newCoupleRes.body.inviteCode).not.toBe(couple.inviteCode);
  });
});
