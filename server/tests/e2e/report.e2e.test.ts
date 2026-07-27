import request from 'supertest';

jest.mock('../../src/openai', () => ({
  generateWeeklyReport: jest.fn(),
}));

import { app } from '../../src/app';
import { db } from '../../src/db';
import { generateWeeklyReport } from '../../src/openai';

const mockGenerate = generateWeeklyReport as jest.Mock;

const FAKE_REPORT = {
  narrative: 'Это была тёплая неделя для вас двоих.',
  insight: 'Вы оба чаще писали по вечерам.',
  appreciationHighlight: 'Алиса оценила поддержку Боба.',
  loveMapNote: 'Боб упомянул любимый сериал Алисы.',
};

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

async function addEntry(token: string, text = 'Something happened') {
  return request(app)
    .post('/api/entries')
    .set('Authorization', `Bearer ${token}`)
    .send({ type: 'joy', emotion: 'joy', text, tags: [] });
}

// /generate auto-creates a couple for a solo user the moment it's first
// called (ensureCoupleContext), and the report window starts at that
// couple's createdAt. In real usage a solo user already has an invite-code
// couple (created the moment they open the pairing screen) long before they
// generate a report, so entries always postdate it. Tests need the same
// ordering -- otherwise entries added before this helper runs would predate
// the window and look "unreported forever".
async function signupSoloWithCouple(name: string, label: string) {
  const soloUser = await signupAndLogin(name, label);
  await request(app).post('/api/couples').set('Authorization', `Bearer ${soloUser.token}`).send();
  return soloUser;
}

const ORIGINAL_KEY = process.env.OPENAI_API_KEY;

beforeEach(() => {
  mockGenerate.mockReset();
  mockGenerate.mockResolvedValue(FAKE_REPORT);
});

afterAll(() => {
  process.env.OPENAI_API_KEY = ORIGINAL_KEY;
});

describe('POST /api/report/generate without an API key configured', () => {
  it('refuses to generate and does not call the model', async () => {
    delete process.env.OPENAI_API_KEY;
    const alice = await signupAndLogin('Alice', 'report-nokey');
    const res = await request(app).post('/api/report/generate').set('Authorization', `Bearer ${alice.token}`);
    expect(res.status).toBe(500);
    expect(mockGenerate).not.toHaveBeenCalled();
  });
});

describe('POST /api/report/generate with an API key configured', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key';
  });

  it('refuses when there is nothing new to report', async () => {
    const alice = await signupAndLogin('Alice', 'report-empty');
    const res = await request(app).post('/api/report/generate').set('Authorization', `Bearer ${alice.token}`);
    expect(res.status).toBe(409);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('generates a report from a solo user’s own entries', async () => {
    const alice = await signupSoloWithCouple('Alice', 'report-solo');
    await addEntry(alice.token, 'A good day');

    const res = await request(app).post('/api/report/generate').set('Authorization', `Bearer ${alice.token}`);
    expect(res.status).toBe(200);
    expect(res.body.report.narrative).toBe(FAKE_REPORT.narrative);
    expect(res.body.report.myEntries).toHaveLength(1);
    expect(res.body.report.partnerEntries).toHaveLength(0);
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });

  it('generates a shared report combining both partners’ entries', async () => {
    const { alice, bob } = await pairUp('report-shared');
    await addEntry(alice.token, 'Alice entry');
    await addEntry(bob.token, 'Bob entry');

    const res = await request(app).post('/api/report/generate').set('Authorization', `Bearer ${alice.token}`);
    expect(res.status).toBe(200);
    expect(res.body.report.myEntries).toHaveLength(1);
    expect(res.body.report.partnerEntries).toHaveLength(1);

    const call = mockGenerate.mock.calls[0][0];
    expect(call.userAName).toBe('Alice');
    expect(call.userBName).toBe('Bob');
    expect(call.entriesA).toHaveLength(1);
    expect(call.entriesB).toHaveLength(1);
  });

  it('marks reported entries as locked (included in the report)', async () => {
    const alice = await signupSoloWithCouple('Alice', 'report-lock');
    const entry = await addEntry(alice.token, 'Locked soon');

    await request(app).post('/api/report/generate').set('Authorization', `Bearer ${alice.token}`);

    const stored = await db.entry.findUnique({ where: { id: entry.body.id } });
    expect(stored?.includedInReportId).not.toBeNull();

    // And it should now be immutable via the entries API.
    const updateRes = await request(app)
      .patch(`/api/entries/${entry.body.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ type: 'joy', emotion: 'joy', text: 'edit attempt', tags: [] });
    expect(updateRes.status).toBe(409);
  });

  it('does not re-report entries already included in a previous report', async () => {
    const alice = await signupSoloWithCouple('Alice', 'report-norepeat');
    await addEntry(alice.token, 'First week');
    await request(app).post('/api/report/generate').set('Authorization', `Bearer ${alice.token}`);

    // No new entries since -- should be empty again.
    const second = await request(app).post('/api/report/generate').set('Authorization', `Bearer ${alice.token}`);
    expect(second.status).toBe(409);
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });

  it('propagates a model failure as a 502 without creating a report', async () => {
    mockGenerate.mockRejectedValue(new Error('model exploded'));
    const alice = await signupSoloWithCouple('Alice', 'report-modelerror');
    await addEntry(alice.token);

    const res = await request(app).post('/api/report/generate').set('Authorization', `Bearer ${alice.token}`);
    expect(res.status).toBe(502);

    const reports = await db.weeklyReport.count();
    expect(reports).toBe(0);
  });
});

describe('GET /api/report/latest', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key';
  });

  it('returns null when no report exists yet', async () => {
    const alice = await signupAndLogin('Alice', 'report-latest-none');
    const res = await request(app).get('/api/report/latest').set('Authorization', `Bearer ${alice.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  it('returns the most recently generated report', async () => {
    const alice = await signupSoloWithCouple('Alice', 'report-latest-some');
    await addEntry(alice.token);
    const generated = await request(app)
      .post('/api/report/generate')
      .set('Authorization', `Bearer ${alice.token}`);

    const res = await request(app).get('/api/report/latest').set('Authorization', `Bearer ${alice.token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(generated.body.id);
    expect(res.body.report.narrative).toBe(FAKE_REPORT.narrative);
  });
});

describe('GET /api/report/history and /api/report/history/:id', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key';
  });

  it('lists generated reports newest first', async () => {
    const alice = await signupSoloWithCouple('Alice', 'report-history');
    await addEntry(alice.token, 'week one');
    const first = await request(app).post('/api/report/generate').set('Authorization', `Bearer ${alice.token}`);
    await addEntry(alice.token, 'week two');
    const second = await request(app).post('/api/report/generate').set('Authorization', `Bearer ${alice.token}`);

    const res = await request(app).get('/api/report/history').set('Authorization', `Bearer ${alice.token}`);
    expect(res.status).toBe(200);
    expect(res.body.map((r: { id: string }) => r.id)).toEqual([second.body.id, first.body.id]);
  });

  it('fetches a specific historical report by id', async () => {
    const alice = await signupSoloWithCouple('Alice', 'report-history-detail');
    await addEntry(alice.token);
    const generated = await request(app)
      .post('/api/report/generate')
      .set('Authorization', `Bearer ${alice.token}`);

    const res = await request(app)
      .get(`/api/report/history/${generated.body.id}`)
      .set('Authorization', `Bearer ${alice.token}`);
    expect(res.status).toBe(200);
    expect(res.body.report.narrative).toBe(FAKE_REPORT.narrative);
  });

  it('returns 404 for a report belonging to a different couple', async () => {
    const alice = await signupSoloWithCouple('Alice', 'report-history-alice');
    await addEntry(alice.token);
    const generated = await request(app)
      .post('/api/report/generate')
      .set('Authorization', `Bearer ${alice.token}`);

    const stranger = await signupAndLogin('Stranger', 'report-history-stranger');
    const res = await request(app)
      .get(`/api/report/history/${generated.body.id}`)
      .set('Authorization', `Bearer ${stranger.token}`);
    expect(res.status).toBe(404);
  });
});
