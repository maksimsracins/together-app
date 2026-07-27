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

describe('PATCH /api/couples/settings validation', () => {
  it('rejects an out-of-range reportWeekday', async () => {
    const alice = await signupAndLogin('Alice', 'settings-badweekday');
    const res = await request(app)
      .patch('/api/couples/settings')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ reportWeekday: 8 });
    expect(res.status).toBe(400);
  });

  it('rejects an out-of-range reportHour', async () => {
    const alice = await signupAndLogin('Alice', 'settings-badhour');
    const res = await request(app)
      .patch('/api/couples/settings')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ reportHour: 24 });
    expect(res.status).toBe(400);
  });

  it('auto-creates a couple for a solo user on first settings write', async () => {
    const alice = await signupAndLogin('Alice', 'settings-autocouple');
    const res = await request(app)
      .patch('/api/couples/settings')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ reportHour: 10 });
    expect(res.status).toBe(200);
    expect(res.body.reportHour).toBe(10);

    const user = await db.user.findUnique({ where: { id: alice.userId } });
    expect(user?.coupleId).not.toBeNull();
  });
});

describe('PATCH /api/couples/settings schedule-change rate limit', () => {
  it('allows up to 3 schedule changes within 7 days', async () => {
    const alice = await signupAndLogin('Alice', 'settings-limit-ok');
    for (let hour = 8; hour < 11; hour++) {
      const res = await request(app)
        .patch('/api/couples/settings')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({ reportHour: hour });
      expect(res.status).toBe(200);
    }
  });

  it('rejects a 4th schedule change within the 7-day window', async () => {
    const alice = await signupAndLogin('Alice', 'settings-limit-block');
    for (let hour = 8; hour < 11; hour++) {
      await request(app)
        .patch('/api/couples/settings')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({ reportHour: hour });
    }

    const fourth = await request(app)
      .patch('/api/couples/settings')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ reportHour: 12 });
    expect(fourth.status).toBe(429);

    // The rejected change must not have been applied.
    const settings = await request(app)
      .get('/api/couples/settings')
      .set('Authorization', `Bearer ${alice.token}`);
    expect(settings.body.reportHour).toBe(10);
  });

  it('does not count non-schedule changes (notification toggles) against the limit', async () => {
    const alice = await signupAndLogin('Alice', 'settings-limit-notifications');
    for (let hour = 8; hour < 11; hour++) {
      await request(app)
        .patch('/api/couples/settings')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({ reportHour: hour });
    }

    // Schedule is now maxed out, but toggling notification flags is unrelated.
    const toggle = await request(app)
      .patch('/api/couples/settings')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ notificationsEnabled: true });
    expect(toggle.status).toBe(200);
    expect(toggle.body.notificationsEnabled).toBe(true);
  });

  it('allows a new schedule change once earlier ones have aged out of the 7-day window', async () => {
    const alice = await signupAndLogin('Alice', 'settings-limit-expired');
    // Establish the couple and hit the limit.
    for (let hour = 8; hour < 11; hour++) {
      await request(app)
        .patch('/api/couples/settings')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({ reportHour: hour });
    }
    const blocked = await request(app)
      .patch('/api/couples/settings')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ reportHour: 12 });
    expect(blocked.status).toBe(429);

    // Age all recorded changes past the 7-day window.
    const user = await db.user.findUnique({ where: { id: alice.userId } });
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    await db.couple.update({
      where: { id: user!.coupleId! },
      data: { reportScheduleChanges: JSON.stringify([eightDaysAgo, eightDaysAgo, eightDaysAgo]) },
    });

    const res = await request(app)
      .patch('/api/couples/settings')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ reportHour: 12 });
    expect(res.status).toBe(200);
    expect(res.body.reportHour).toBe(12);
  });
});
