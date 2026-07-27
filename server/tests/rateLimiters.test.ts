import request from 'supertest';
import express from 'express';

// rateLimiters.ts skips entirely when NODE_ENV === 'test' (so the e2e suite's
// own fixture setup -- far more signups/joins per "IP" than any real user --
// doesn't get blocked). That means this file must load the module fresh with
// NODE_ENV temporarily set to something else, to actually exercise the real
// limiting behavior rather than just asserting the skip works.
describe('rate limiters', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('blocks requests once the limit is exceeded within the window', async () => {
    let authLimiter: express.RequestHandler;
    await jest.isolateModulesAsync(async () => {
      process.env.NODE_ENV = 'production';
      ({ authLimiter } = await import('../src/rateLimiters'));
    });

    const app = express();
    app.get('/test', authLimiter!, (_req, res) => res.json({ ok: true }));

    for (let i = 0; i < 20; i++) {
      const res = await request(app).get('/test');
      expect(res.status).toBe(200);
    }
    const blocked = await request(app).get('/test');
    expect(blocked.status).toBe(429);
  });

  it('is skipped entirely in the test environment (NODE_ENV=test)', async () => {
    let authLimiter: express.RequestHandler;
    await jest.isolateModulesAsync(async () => {
      process.env.NODE_ENV = 'test';
      ({ authLimiter } = await import('../src/rateLimiters'));
    });

    const app = express();
    app.get('/test', authLimiter!, (_req, res) => res.json({ ok: true }));

    for (let i = 0; i < 25; i++) {
      const res = await request(app).get('/test');
      expect(res.status).toBe(200);
    }
  });
});
