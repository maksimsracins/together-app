import request from 'supertest';
import { app } from '../../src/app';
import { db } from '../../src/db';

function uniqueEmail(label: string) {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function signupAndLogin(name: string, label: string) {
  const email = uniqueEmail(label);
  const res = await request(app).post('/api/auth/signup').send({ name, email, password: 'password123' });
  return { token: res.body.token as string, userId: res.body.user.id as string, email };
}

async function pairUp(labelPrefix: string) {
  const alice = await signupAndLogin('Alice', `${labelPrefix}-alice`);
  const bob = await signupAndLogin('Bob', `${labelPrefix}-bob`);

  const { body: couple } = await request(app)
    .post('/api/couples')
    .set('Authorization', `Bearer ${alice.token}`)
    .send();
  await request(app)
    .post('/api/couples/join')
    .set('Authorization', `Bearer ${bob.token}`)
    .send({ code: couple.inviteCode });

  return { alice, bob, couple };
}

describe('GET /api/me', () => {
  it('rejects without a token', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
  });

  it('returns the current user, never the password hash', async () => {
    const alice = await signupAndLogin('Alice', 'me-basic');
    const res = await request(app).get('/api/me').set('Authorization', `Bearer ${alice.token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(alice.userId);
    expect(res.body.passwordHash).toBeUndefined();
  });
});

describe('PATCH /api/me', () => {
  it('updates simple profile fields', async () => {
    const alice = await signupAndLogin('Alice', 'update-basic');
    const res = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'Alicia', occupation: 'Painter', city: 'Riga', habits: 'early riser' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'Alicia', occupation: 'Painter', city: 'Riga', habits: 'early riser' });
  });

  it('rejects a name longer than 20 characters', async () => {
    const alice = await signupAndLogin('Alice', 'update-longname');
    const res = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'a'.repeat(21) });
    expect(res.status).toBe(400);
  });

  it('rejects an avatarUri that is not a data:image/ URI', async () => {
    const alice = await signupAndLogin('Alice', 'update-badavatar');
    const res = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ avatarUri: 'https://example.com/x.jpg' });
    expect(res.status).toBe(400);
  });

  it('rejects an avatarUri over the size limit', async () => {
    const alice = await signupAndLogin('Alice', 'update-hugeavatar');
    // Just over the route's own 5MB limit, but comfortably under Express's
    // outer 6MB JSON body-parser limit, so this exercises the route's own
    // validation (a friendly 400) rather than tripping the parser's 413 first.
    const oversized = 'data:image/jpeg;base64,' + 'a'.repeat(5 * 1024 * 1024 + 1024);
    const res = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ avatarUri: oversized });
    expect(res.status).toBe(400);
  });

  it('stores loveLanguages and interests as arrays round-trip', async () => {
    const alice = await signupAndLogin('Alice', 'update-arrays');
    const res = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ loveLanguages: ['words', 'touch'], interests: ['hiking', 'cooking'] });
    expect(res.status).toBe(200);
    expect(res.body.loveLanguages).toEqual(['words', 'touch']);
    expect(res.body.interests).toEqual(['hiking', 'cooking']);
  });

  it('clears a nullable field by sending null', async () => {
    const alice = await signupAndLogin('Alice', 'update-clear');
    await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ city: 'Riga' });
    const res = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ city: null });
    expect(res.status).toBe(200);
    expect(res.body.city).toBeNull();
  });
});

describe('GET /api/me/partner', () => {
  it('returns null when not paired', async () => {
    const alice = await signupAndLogin('Alice', 'partner-none');
    const res = await request(app).get('/api/me/partner').set('Authorization', `Bearer ${alice.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  it('returns the partner once paired', async () => {
    const { alice, bob } = await pairUp('partner-basic');
    const res = await request(app).get('/api/me/partner').set('Authorization', `Bearer ${alice.token}`);
    expect(res.body.id).toBe(bob.userId);
  });
});

describe('DELETE /api/me (account deletion)', () => {
  it('deletes a solo account and invalidates its token', async () => {
    const alice = await signupAndLogin('Alice', 'delete-solo');

    const res = await request(app).delete('/api/me').set('Authorization', `Bearer ${alice.token}`);
    expect(res.status).toBe(204);

    const after = await request(app).get('/api/me').set('Authorization', `Bearer ${alice.token}`);
    expect(after.status).toBe(404);
  });

  it('rejects deleting without a token', async () => {
    const res = await request(app).delete('/api/me');
    expect(res.status).toBe(401);
  });

  it("dissolves the couple and notifies the partner when a paired user deletes their account", async () => {
    const { alice, bob } = await pairUp('delete-paired');

    const res = await request(app).delete('/api/me').set('Authorization', `Bearer ${alice.token}`);
    expect(res.status).toBe(204);

    const bobMe = await request(app).get('/api/me').set('Authorization', `Bearer ${bob.token}`);
    expect(bobMe.body.coupleId).toBeNull();

    const bobNotifications = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${bob.token}`);
    expect(bobNotifications.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'partner_left', message: expect.stringContaining('Alice') })])
    );
  });

  it("removes the deleted user's entries and notifications from the database", async () => {
    const alice = await signupAndLogin('Alice', 'delete-cascade');
    await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ type: 'joy', emotion: 'joy', text: 'hello', tags: [] });

    await request(app).delete('/api/me').set('Authorization', `Bearer ${alice.token}`);

    const entries = await db.entry.findMany({ where: { userId: alice.userId } });
    expect(entries).toHaveLength(0);
    const notifications = await db.notification.findMany({ where: { userId: alice.userId } });
    expect(notifications).toHaveLength(0);
    const user = await db.user.findUnique({ where: { id: alice.userId } });
    expect(user).toBeNull();
  });

  it('lets the remaining partner re-pair with someone else after the other deletes their account', async () => {
    const { alice, bob } = await pairUp('delete-repair');
    const carol = await signupAndLogin('Carol', 'delete-repair-carol');

    await request(app).delete('/api/me').set('Authorization', `Bearer ${alice.token}`);

    const newCoupleRes = await request(app)
      .post('/api/couples')
      .set('Authorization', `Bearer ${bob.token}`)
      .send();
    expect(newCoupleRes.status).toBe(201);

    const joinRes = await request(app)
      .post('/api/couples/join')
      .set('Authorization', `Bearer ${carol.token}`)
      .send({ code: newCoupleRes.body.inviteCode });
    expect(joinRes.status).toBe(200);
  });

  it('returns 404 for a token whose user no longer exists', async () => {
    const alice = await signupAndLogin('Alice', 'delete-twice');
    await request(app).delete('/api/me').set('Authorization', `Bearer ${alice.token}`);

    const second = await request(app).delete('/api/me').set('Authorization', `Bearer ${alice.token}`);
    expect(second.status).toBe(404);
  });
});
