/* eslint-disable no-console */
// Standalone load/perf probe -- not part of `npm test`. Boots the real app
// against a dedicated, disposable Postgres database (together_stress, never
// touches together_dev or together_test), fires concurrent requests at the
// hottest endpoints, and reports latency percentiles + error counts. Also
// specifically probes concurrent writes to the same couple, since that's
// exactly the shape of traffic two real partners generate.
import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

const SERVER_DIR = path.resolve(__dirname, '..');
const ENV_FILE = path.resolve(SERVER_DIR, '.env.stress');
dotenv.config({ path: ENV_FILE, override: true });

// This script measures raw throughput/contention (bcrypt cost, write
// contention, etc.), not anti-abuse behavior -- rate limiting has its own
// dedicated test (tests/rateLimiters.test.ts) and would otherwise dominate
// every result here the same way it's designed to against a real attacker.
process.env.NODE_ENV = 'test';

execSync('npx prisma migrate reset --force --skip-generate --skip-seed', {
  cwd: SERVER_DIR,
  env: process.env,
  stdio: 'inherit',
});

// Imported only after env + schema are ready, so PrismaClient picks up the
// stress DATABASE_URL instead of dev.db.
/* eslint-disable @typescript-eslint/no-var-requires */
const { app } = require('../src/app');
const { db } = require('../src/db');

interface Timing {
  ok: boolean;
  status: number;
  ms: number;
}

function percentile(sorted: number[], p: number) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function report(label: string, timings: Timing[], wallMs: number) {
  const durations = timings.map((t) => t.ms).sort((a, b) => a - b);
  const errors = timings.filter((t) => !t.ok);
  const rps = (timings.length / wallMs) * 1000;
  console.log(`\n--- ${label} ---`);
  console.log(`  requests: ${timings.length}, errors: ${errors.length}, wall: ${wallMs.toFixed(0)}ms, throughput: ${rps.toFixed(1)} req/s`);
  console.log(
    `  latency ms  p50=${percentile(durations, 50).toFixed(1)}  p95=${percentile(durations, 95).toFixed(1)}  p99=${percentile(durations, 99).toFixed(1)}  max=${durations[durations.length - 1]?.toFixed(1) ?? 0}`
  );
  if (errors.length > 0) {
    const byStatus = new Map<number, number>();
    for (const e of errors) byStatus.set(e.status, (byStatus.get(e.status) ?? 0) + 1);
    console.log(`  error statuses: ${[...byStatus.entries()].map(([s, c]) => `${s}x${c}`).join(', ')}`);
  }
  return { errors: errors.length, durations };
}

async function timedRequest(base: string, opts: { method?: string; path: string; token?: string; body?: unknown }): Promise<Timing> {
  const start = Date.now();
  try {
    const res = await fetch(`${base}${opts.path}`, {
      method: opts.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    await res.text();
    return { ok: res.ok, status: res.status, ms: Date.now() - start };
  } catch (err) {
    return { ok: false, status: 0, ms: Date.now() - start };
  }
}

async function main() {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;
  console.log(`Stress server listening on ${base} (db: ${process.env.DATABASE_URL})`);

  let failed = false;

  // --- Scenario 1: concurrent signups (unique users, no shared state) ---
  {
    const N = 200;
    const start = Date.now();
    const timings = await Promise.all(
      Array.from({ length: N }, (_, i) =>
        timedRequest(base, {
          method: 'POST',
          path: '/api/auth/signup',
          body: { name: `Stress${i}`, email: `stress-signup-${i}-${Date.now()}@example.com`, password: 'password123' },
        })
      )
    );
    const { errors } = report('Concurrent signups (N=200, distinct users)', timings, Date.now() - start);
    if (errors > 0) failed = true;
  }

  // --- Scenario 2: concurrent logins for a pre-seeded set of users ---
  {
    const N = 200;
    const creds = Array.from({ length: N }, (_, i) => ({
      email: `stress-login-${i}-${Date.now()}@example.com`,
      password: 'password123',
    }));
    for (const c of creds) {
      await timedRequest(base, { method: 'POST', path: '/api/auth/signup', body: { name: 'Login', ...c } });
    }
    const start = Date.now();
    const timings = await Promise.all(
      creds.map((c) => timedRequest(base, { method: 'POST', path: '/api/auth/login', body: c }))
    );
    const { errors } = report('Concurrent logins (N=200, distinct users)', timings, Date.now() - start);
    if (errors > 0) failed = true;
  }

  // --- Scenario 3: many distinct users each creating an entry concurrently ---
  {
    const N = 200;
    const tokens: string[] = [];
    for (let i = 0; i < N; i++) {
      const res = await fetch(`${base}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Writer', email: `stress-entry-${i}-${Date.now()}@example.com`, password: 'password123' }),
      });
      const body = (await res.json()) as { token: string };
      tokens.push(body.token);
    }
    const start = Date.now();
    const timings = await Promise.all(
      tokens.map((token) =>
        timedRequest(base, {
          method: 'POST',
          path: '/api/entries',
          token,
          body: { type: 'joy', emotion: 'joy', text: 'stress entry', tags: [] },
        })
      )
    );
    const { errors } = report('Concurrent entry creation (N=200, distinct users)', timings, Date.now() - start);
    if (errors > 0) failed = true;
  }

  // --- Scenario 4: same-user concurrent writes -- the real contention case ---
  // Two real partners hammering the same couple's data (rapid-fire journaling,
  // reactions, etc.) is the shape of traffic most likely to expose row/table
  // lock contention under Postgres's connection pooling.
  {
    const signup = await fetch(`${base}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Contended', email: `stress-contended-${Date.now()}@example.com`, password: 'password123' }),
    });
    const { token } = (await signup.json()) as { token: string };

    const N = 100;
    const start = Date.now();
    const timings = await Promise.all(
      Array.from({ length: N }, () =>
        timedRequest(base, {
          method: 'POST',
          path: '/api/entries',
          token,
          body: { type: 'joy', emotion: 'joy', text: 'contended entry', tags: [] },
        })
      )
    );
    const { errors } = report('Concurrent writes to ONE user (N=100, same row lineage)', timings, Date.now() - start);
    if (errors > 0) {
      failed = true;
      console.log('  ^ Write contention detected under concurrent load.');
    }

    const listStart = Date.now();
    const listTimings = await Promise.all(
      Array.from({ length: 50 }, () => timedRequest(base, { method: 'GET', path: '/api/entries?all=true', token }))
    );
    report('Concurrent reads while writes settle (N=50)', listTimings, Date.now() - listStart);
  }

  await new Promise<void>((resolve) => server.close(() => resolve()));
  await db.$disconnect();

  console.log(failed ? '\nSTRESS TEST: FAILED (errors observed)' : '\nSTRESS TEST: PASSED (no errors)');
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
