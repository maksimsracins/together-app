import request from 'supertest';
import { app } from '../../src/app';

function uniqueEmail(label: string) {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function signupAndLogin(name: string, label: string) {
  const email = uniqueEmail(label);
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ name, email, password: 'password123' });
  return { token: res.body.token as string, userId: res.body.user.id as string };
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

describe('notifications', () => {
  it('rejects listing notifications without a token', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
  });

  it('notifies the other member when someone leaves the couple, but not the leaver', async () => {
    const { alice, bob } = await pairUp('leave-notify');

    await request(app).post('/api/couples/leave').set('Authorization', `Bearer ${bob.token}`).send();

    const aliceNotifications = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${alice.token}`);
    expect(aliceNotifications.status).toBe(200);
    expect(aliceNotifications.body).toHaveLength(1);
    expect(aliceNotifications.body[0]).toMatchObject({
      type: 'partner_left',
      message: expect.stringContaining('Bob'),
      readAt: null,
    });

    const bobNotifications = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${bob.token}`);
    expect(bobNotifications.body).toHaveLength(0);
  });

  it('marks all notifications as read and clears them on re-fetch', async () => {
    const { alice, bob } = await pairUp('read-all');
    await request(app).post('/api/couples/leave').set('Authorization', `Bearer ${bob.token}`).send();

    const readAllRes = await request(app)
      .post('/api/notifications/read-all')
      .set('Authorization', `Bearer ${alice.token}`)
      .send();
    expect(readAllRes.status).toBe(204);

    const after = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${alice.token}`);
    expect(after.body).toHaveLength(1);
    expect(after.body[0].readAt).toEqual(expect.any(String));
  });

  it('deletes a notification', async () => {
    const { alice, bob } = await pairUp('delete');
    await request(app).post('/api/couples/leave').set('Authorization', `Bearer ${bob.token}`).send();

    const list = await request(app).get('/api/notifications').set('Authorization', `Bearer ${alice.token}`);
    const id = list.body[0].id as string;

    const deleteRes = await request(app)
      .delete(`/api/notifications/${id}`)
      .set('Authorization', `Bearer ${alice.token}`);
    expect(deleteRes.status).toBe(204);

    const after = await request(app).get('/api/notifications').set('Authorization', `Bearer ${alice.token}`);
    expect(after.body).toHaveLength(0);
  });

  it("rejects deleting another user's notification", async () => {
    const { alice, bob } = await pairUp('delete-forbidden');
    await request(app).post('/api/couples/leave').set('Authorization', `Bearer ${bob.token}`).send();

    const list = await request(app).get('/api/notifications').set('Authorization', `Bearer ${alice.token}`);
    const id = list.body[0].id as string;

    // Bob has no notifications of his own, and must not be able to delete Alice's.
    const res = await request(app).delete(`/api/notifications/${id}`).set('Authorization', `Bearer ${bob.token}`);
    expect(res.status).toBe(404);

    const stillThere = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${alice.token}`);
    expect(stillThere.body).toHaveLength(1);
  });

  it('returns 404 deleting a nonexistent notification', async () => {
    const alice = await signupAndLogin('Alice', 'delete-missing');
    const res = await request(app)
      .delete('/api/notifications/does-not-exist')
      .set('Authorization', `Bearer ${alice.token}`);
    expect(res.status).toBe(404);
  });
});
