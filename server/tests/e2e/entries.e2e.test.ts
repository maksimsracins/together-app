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

const validEntry = { type: 'joy', emotion: 'joy', text: 'A lovely day', tags: ['sun'] };

describe('entries validation', () => {
  it('rejects an unknown entry type', async () => {
    const alice = await signupAndLogin('Alice', 'entry-badtype');
    const res = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ ...validEntry, type: 'nonsense' });
    expect(res.status).toBe(400);
  });

  it('rejects an unknown emotion', async () => {
    const alice = await signupAndLogin('Alice', 'entry-bademotion');
    const res = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ ...validEntry, emotion: 'nonsense' });
    expect(res.status).toBe(400);
  });

  it('rejects empty or whitespace-only text', async () => {
    const alice = await signupAndLogin('Alice', 'entry-emptytext');
    const res = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ ...validEntry, text: '   ' });
    expect(res.status).toBe(400);
  });

  it('rejects text over 1000 characters', async () => {
    const alice = await signupAndLogin('Alice', 'entry-longtext');
    const res = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ ...validEntry, text: 'a'.repeat(1001) });
    expect(res.status).toBe(400);
  });

  it('rejects a photoUri that is not a data:image/ URI', async () => {
    const alice = await signupAndLogin('Alice', 'entry-badphoto');
    const res = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ ...validEntry, photoUri: 'https://example.com/x.jpg' });
    expect(res.status).toBe(400);
  });

  it('rejects protected routes without a token', async () => {
    const res = await request(app).post('/api/entries').send(validEntry);
    expect(res.status).toBe(401);
  });
});

describe('entries CRUD', () => {
  it('creates an entry and lists it back for the author', async () => {
    const alice = await signupAndLogin('Alice', 'entry-create');
    const createRes = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${alice.token}`)
      .send(validEntry);
    expect(createRes.status).toBe(201);
    expect(createRes.body).toMatchObject({
      authorId: alice.userId,
      type: 'joy',
      emotion: 'joy',
      text: 'A lovely day',
      tags: ['sun'],
      includedInReportId: null,
    });

    const listRes = await request(app).get('/api/entries').set('Authorization', `Bearer ${alice.token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].id).toBe(createRes.body.id);
  });

  it('trims entry text before storing it', async () => {
    const alice = await signupAndLogin('Alice', 'entry-trim');
    const res = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ ...validEntry, text: '  padded text  ' });
    expect(res.body.text).toBe('padded text');
  });

  it("does not leak one user's entries into another user's list", async () => {
    const alice = await signupAndLogin('Alice', 'entry-isolation-a');
    const bob = await signupAndLogin('Bob', 'entry-isolation-b');
    await request(app).post('/api/entries').set('Authorization', `Bearer ${alice.token}`).send(validEntry);

    const bobList = await request(app).get('/api/entries').set('Authorization', `Bearer ${bob.token}`);
    expect(bobList.body).toHaveLength(0);
  });

  it('updates an entry', async () => {
    const alice = await signupAndLogin('Alice', 'entry-update');
    const created = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${alice.token}`)
      .send(validEntry);

    const updateRes = await request(app)
      .patch(`/api/entries/${created.body.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ ...validEntry, text: 'Updated text', emotion: 'calm' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.text).toBe('Updated text');
    expect(updateRes.body.emotion).toBe('calm');
  });

  it("rejects updating another user's entry", async () => {
    const alice = await signupAndLogin('Alice', 'entry-update-forbidden-a');
    const bob = await signupAndLogin('Bob', 'entry-update-forbidden-b');
    const created = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${alice.token}`)
      .send(validEntry);

    const res = await request(app)
      .patch(`/api/entries/${created.body.id}`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ ...validEntry, text: 'Hijacked' });
    expect(res.status).toBe(404);
  });

  it('deletes an entry', async () => {
    const alice = await signupAndLogin('Alice', 'entry-delete');
    const created = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${alice.token}`)
      .send(validEntry);

    const deleteRes = await request(app)
      .delete(`/api/entries/${created.body.id}`)
      .set('Authorization', `Bearer ${alice.token}`);
    expect(deleteRes.status).toBe(204);

    const listRes = await request(app).get('/api/entries').set('Authorization', `Bearer ${alice.token}`);
    expect(listRes.body).toHaveLength(0);
  });

  it("rejects deleting another user's entry", async () => {
    const alice = await signupAndLogin('Alice', 'entry-delete-forbidden-a');
    const bob = await signupAndLogin('Bob', 'entry-delete-forbidden-b');
    const created = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${alice.token}`)
      .send(validEntry);

    const res = await request(app)
      .delete(`/api/entries/${created.body.id}`)
      .set('Authorization', `Bearer ${bob.token}`);
    expect(res.status).toBe(404);

    const listRes = await request(app).get('/api/entries').set('Authorization', `Bearer ${alice.token}`);
    expect(listRes.body).toHaveLength(1);
  });

  it('returns 404 updating or deleting a nonexistent entry', async () => {
    const alice = await signupAndLogin('Alice', 'entry-missing');
    const updateRes = await request(app)
      .patch('/api/entries/does-not-exist')
      .set('Authorization', `Bearer ${alice.token}`)
      .send(validEntry);
    expect(updateRes.status).toBe(404);

    const deleteRes = await request(app)
      .delete('/api/entries/does-not-exist')
      .set('Authorization', `Bearer ${alice.token}`);
    expect(deleteRes.status).toBe(404);
  });

  it('filters by weekId, and "all" bypasses the filter', async () => {
    const alice = await signupAndLogin('Alice', 'entry-weekid');
    const created = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${alice.token}`)
      .send(validEntry);

    // Backdate the entry into a week that isn't the current one.
    await db.entry.update({ where: { id: created.body.id }, data: { weekId: '2000-W01' } });

    const currentWeek = await request(app).get('/api/entries').set('Authorization', `Bearer ${alice.token}`);
    expect(currentWeek.body).toHaveLength(0);

    const oldWeek = await request(app)
      .get('/api/entries?weekId=2000-W01')
      .set('Authorization', `Bearer ${alice.token}`);
    expect(oldWeek.body).toHaveLength(1);

    const all = await request(app).get('/api/entries?all=true').set('Authorization', `Bearer ${alice.token}`);
    expect(all.body).toHaveLength(1);
  });
});

describe('entry reactions', () => {
  it('lets the author react to their own entry', async () => {
    const alice = await signupAndLogin('Alice', 'reaction-own');
    const created = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${alice.token}`)
      .send(validEntry);

    const res = await request(app)
      .patch(`/api/entries/${created.body.id}/reaction`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ emoji: '❤️' });
    expect(res.status).toBe(200);
    expect(res.body.reactionEmoji).toBe('❤️');
  });

  it("lets a partner react to their partner's entry", async () => {
    const { alice, bob } = await pairUp('reaction-partner');
    const created = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${alice.token}`)
      .send(validEntry);

    const res = await request(app)
      .patch(`/api/entries/${created.body.id}/reaction`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ emoji: '🥰' });
    expect(res.status).toBe(200);
    expect(res.body.reactionEmoji).toBe('🥰');
  });

  it('rejects a stranger reacting to an entry', async () => {
    const alice = await signupAndLogin('Alice', 'reaction-stranger-a');
    const stranger = await signupAndLogin('Stranger', 'reaction-stranger-b');
    const created = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${alice.token}`)
      .send(validEntry);

    const res = await request(app)
      .patch(`/api/entries/${created.body.id}/reaction`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .send({ emoji: '🥰' });
    expect(res.status).toBe(404);
  });

  it('clears a reaction by sending null', async () => {
    const alice = await signupAndLogin('Alice', 'reaction-clear');
    const created = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${alice.token}`)
      .send(validEntry);
    await request(app)
      .patch(`/api/entries/${created.body.id}/reaction`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ emoji: '❤️' });

    const res = await request(app)
      .patch(`/api/entries/${created.body.id}/reaction`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ emoji: null });
    expect(res.status).toBe(200);
    expect(res.body.reactionEmoji).toBeNull();
  });
});

describe('entries once included in a report', () => {
  async function createLockedEntry(token: string, coupleId: string) {
    const created = await request(app).post('/api/entries').set('Authorization', `Bearer ${token}`).send(validEntry);
    const report = await db.weeklyReport.create({
      data: { coupleId, weekId: 'test', weekLabel: 'test', reportJson: '{}' },
    });
    await db.entry.update({ where: { id: created.body.id }, data: { includedInReportId: report.id } });
    return created.body.id as string;
  }

  it('refuses to update an entry already included in a report', async () => {
    const { alice, couple } = await pairUp('entry-locked-update');
    const id = await createLockedEntry(alice.token, couple.id);

    const res = await request(app)
      .patch(`/api/entries/${id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ ...validEntry, text: 'trying to edit' });
    expect(res.status).toBe(409);
  });

  it('refuses to delete an entry already included in a report', async () => {
    const { alice, couple } = await pairUp('entry-locked-delete');
    const id = await createLockedEntry(alice.token, couple.id);

    const res = await request(app).delete(`/api/entries/${id}`).set('Authorization', `Bearer ${alice.token}`);
    expect(res.status).toBe(409);
  });

  it('still allows reacting to a locked entry', async () => {
    const { alice, couple } = await pairUp('entry-locked-react');
    const id = await createLockedEntry(alice.token, couple.id);

    const res = await request(app)
      .patch(`/api/entries/${id}/reaction`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ emoji: '👍' });
    expect(res.status).toBe(200);
  });
});

describe('partner entry visibility', () => {
  it('shows nothing from a partner before any report has been generated', async () => {
    const { alice, bob } = await pairUp('partner-visibility-none');
    await request(app).post('/api/entries').set('Authorization', `Bearer ${alice.token}`).send(validEntry);

    const res = await request(app).get('/api/entries/partner').set('Authorization', `Bearer ${bob.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it('shows nothing when not paired', async () => {
    const alice = await signupAndLogin('Alice', 'partner-visibility-unpaired');
    const res = await request(app).get('/api/entries/partner').set('Authorization', `Bearer ${alice.token}`);
    expect(res.body).toHaveLength(0);
  });

  it("unlocks a partner's entries once a report has surfaced them, permanently", async () => {
    const { alice, bob, couple } = await pairUp('partner-visibility-unlock');
    const created = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${alice.token}`)
      .send(validEntry);

    // Simulate report generation without touching OpenAI: create the report
    // row and mark the entry as included in it, exactly as runReportGeneration does.
    const report = await db.weeklyReport.create({
      data: { coupleId: couple.id, weekId: 'test', weekLabel: 'test', reportJson: '{}' },
    });
    await db.entry.update({ where: { id: created.body.id }, data: { includedInReportId: report.id } });

    const afterReport = await request(app).get('/api/entries/partner').set('Authorization', `Bearer ${bob.token}`);
    expect(afterReport.status).toBe(200);
    expect(afterReport.body).toHaveLength(1);
    expect(afterReport.body[0].id).toBe(created.body.id);

    // A second, newer report shouldn't hide the earlier entry again.
    await db.weeklyReport.create({
      data: { coupleId: couple.id, weekId: 'test2', weekLabel: 'test2', reportJson: '{}' },
    });
    const stillThere = await request(app).get('/api/entries/partner').set('Authorization', `Bearer ${bob.token}`);
    expect(stillThere.body.map((e: { id: string }) => e.id)).toContain(created.body.id);

    // But an entry written after the latest report isn't unlocked just because
    // some report (an older one) exists -- it needs its own report first.
    const newerEntry = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${alice.token}`)
      .send(validEntry);
    const afterNewerEntry = await request(app)
      .get('/api/entries/partner')
      .set('Authorization', `Bearer ${bob.token}`);
    expect(afterNewerEntry.body.map((e: { id: string }) => e.id)).not.toContain(newerEntry.body.id);
  });

  it("reports which dates a partner wrote on via /partner/activity, without exposing text", async () => {
    const { alice, bob } = await pairUp('partner-activity');
    await request(app).post('/api/entries').set('Authorization', `Bearer ${alice.token}`).send(validEntry);

    const res = await request(app)
      .get('/api/entries/partner/activity')
      .set('Authorization', `Bearer ${bob.token}`);
    expect(res.status).toBe(200);
    expect(res.body.createdAts).toHaveLength(1);
    expect(res.body).not.toHaveProperty('text');
  });
});
