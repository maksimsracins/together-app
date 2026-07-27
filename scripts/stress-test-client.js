/* eslint-disable no-console */
// Client-side stress probe. The client is a single-user mobile app, not a
// server, so "concurrent requests" isn't the right shape of stress test --
// instead this checks:
//   1) Computational hot spots in client code whose cost scales with a
//      long-term user's total data (the calendar screen scans the user's
//      ENTIRE lifetime entry history on every render).
//   2) The request bursts the UI itself can realistically fire (rapid
//      refocus, double-taps) against a real server instance, mirroring the
//      exact calls src/services/entries.ts makes.
'use strict';

const path = require('path');
const { execSync } = require('child_process');
const { createRequire } = require('module');

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function makeEntries(n) {
  const start = Date.now() - n * 6 * 60 * 60 * 1000; // spread a few per day, going backward
  const entries = [];
  for (let i = 0; i < n; i++) {
    entries.push({ id: String(i), createdAt: new Date(start + i * 6 * 60 * 60 * 1000).toISOString() });
  }
  return entries;
}

// Exactly the pattern in app/(tabs)/calendar.tsx: hasEntry() and
// hasPartnerActivity() are plain closures re-created every render, each doing
// a full linear .some() scan, called once per day cell (7 cells x 2 rows = 14
// scans per render) with NO memoization -- so cost is O(cells * totalEntries)
// on every keystroke/state change, not just when data or the visible week changes.
function currentImplementation(entries, weekDays) {
  const hasEntry = (day) => entries.some((e) => isSameDay(new Date(e.createdAt), day));
  let hits = 0;
  for (const day of weekDays) if (hasEntry(day)) hits++;
  return hits;
}

// A memoizable fix: bucket once into a Set of 'YYYY-MM-DD' keys, O(totalEntries)
// exactly once per data change, then O(1) per cell lookup regardless of history size.
function fixedImplementation(entries, weekDays) {
  const days = new Set(entries.map((e) => e.createdAt.slice(0, 10)));
  let hits = 0;
  for (const day of weekDays) {
    const key = day.toISOString().slice(0, 10);
    if (days.has(key)) hits++;
  }
  return hits;
}

function bench(fn, entries, weekDays, renders) {
  const start = process.hrtime.bigint();
  for (let r = 0; r < renders; r++) fn(entries, weekDays);
  const end = process.hrtime.bigint();
  return Number(end - start) / 1e6; // ms
}

function runCalendarBenchmark() {
  console.log('=== Calendar day-lookup: current O(n) scan vs a Set-based fix ===');
  const weekDays = Array.from({ length: 7 }, (_, i) => new Date(Date.now() - i * 24 * 60 * 60 * 1000));
  // 14 scans/render (mine + partner rows) is what the real screen does; a
  // user re-rendering the screen ~20x while browsing (paging weeks, opening
  // days) is a realistic single-session number to amortize against.
  const RENDERS = 20;

  for (const n of [500, 2000, 10000, 50000]) {
    const entries = makeEntries(n);
    const currentMs = bench(
      (e, d) => {
        for (let row = 0; row < 2; row++) currentImplementation(e, d);
      },
      entries,
      weekDays,
      RENDERS
    );
    const fixedMs = bench(
      (e, d) => {
        for (let row = 0; row < 2; row++) fixedImplementation(e, d);
      },
      entries,
      weekDays,
      RENDERS
    );
    const perRenderCurrent = currentMs / RENDERS;
    const perRenderFixed = fixedMs / RENDERS;
    const flag = perRenderCurrent > 16 ? '  <-- exceeds one 60fps frame budget (16ms)' : '';
    console.log(
      `  entries=${String(n).padStart(6)}  current=${perRenderCurrent.toFixed(3)}ms/render  fixed=${perRenderFixed.toFixed(3)}ms/render  speedup=${(perRenderCurrent / perRenderFixed).toFixed(0)}x${flag}`
    );
  }
}

async function runRequestBurstBenchmark() {
  console.log('\n=== Realistic client request bursts against a live server ===');

  const SERVER_DIR = path.resolve(__dirname, '../server');
  const ENV_FILE = path.resolve(SERVER_DIR, '.env.stress');
  // Resolve server-local packages (dotenv, tsx) via a require scoped to the
  // server dir, since this script lives in the client's own scripts/ folder.
  const serverRequire = createRequire(path.join(SERVER_DIR, 'package.json'));
  serverRequire('dotenv').config({ path: ENV_FILE, override: true });
  // Bypass the auth rate limiter (own dedicated test covers that) so re-runs
  // during iteration never get blocked by earlier runs' signups.
  process.env.NODE_ENV = 'test';

  // Shares the same together_stress Postgres database as server/scripts/
  // stress-test.ts (.env.stress already points there) -- fine since these
  // are manual, sequential-use scripts, never run concurrently.
  execSync('npx prisma migrate reset --force --skip-generate --skip-seed', {
    cwd: SERVER_DIR,
    env: process.env,
    stdio: 'inherit',
  });

  serverRequire('tsx/cjs');
  const { app } = serverRequire(path.resolve(SERVER_DIR, 'src/app.ts'));
  const { db } = serverRequire(path.resolve(SERVER_DIR, 'src/db.ts'));

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  async function signup(email) {
    const res = await fetch(`${base}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Stress', email, password: 'password123' }),
    });
    return (await res.json()).token;
  }

  async function timed(fn) {
    const start = Date.now();
    try {
      const res = await fn();
      await res.text();
      return { ok: res.ok, status: res.status, ms: Date.now() - start };
    } catch {
      return { ok: false, status: 0, ms: Date.now() - start };
    }
  }

  function summarize(label, timings) {
    const errors = timings.filter((t) => !t.ok).length;
    const ms = timings.map((t) => t.ms).sort((a, b) => a - b);
    const p95 = ms[Math.floor(ms.length * 0.95)] ?? ms[ms.length - 1] ?? 0;
    console.log(`  ${label}: ${timings.length} reqs, ${errors} errors, max=${ms[ms.length - 1]}ms p95=${p95}ms`);
    return errors;
  }

  let failed = false;
  const token = await signup(`client-stress-${Date.now()}@example.com`);

  // Rapid-refocus: calendar.tsx's useFocusEffect fires Promise.all([listAllEntries(), getPartnerActivity()])
  // every single time the tab regains focus. A user flicking rapidly between
  // tabs (or a focus-effect bug causing repeat fires) can burst these.
  {
    const timings = await Promise.all(
      Array.from({ length: 30 }, () =>
        timed(() => fetch(`${base}/api/entries?all=true`, { headers: { Authorization: `Bearer ${token}` } }))
      )
    );
    if (summarize('Rapid calendar refocus (30x listAllEntries)', timings) > 0) failed = true;
  }

  // Double-tap "save entry": nothing in EntryForm/store visibly debounces the
  // submit button, so a fast double-tap before the button visually disables
  // can fire the POST twice. Verify the server doesn't silently corrupt state
  // (both are just fine as separate entries) and check latency stays sane.
  {
    const timings = await Promise.all(
      Array.from({ length: 2 }, () =>
        timed(() =>
          fetch(`${base}/api/entries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ type: 'joy', emotion: 'joy', text: 'double tap', tags: [] }),
          })
        )
      )
    );
    summarize('Double-tap "add entry" (2x concurrent POST)', timings);
    const count = await db.entry.count();
    console.log(`  -> resulting entry rows: ${count} (both taps land as separate entries -- known, see report)`);
  }

  // Pull-to-refresh spam: user yanks the list repeatedly while impatient.
  {
    const timings = await Promise.all(
      Array.from({ length: 15 }, () =>
        timed(() => fetch(`${base}/api/report/latest`, { headers: { Authorization: `Bearer ${token}` } }))
      )
    );
    if (summarize('Pull-to-refresh spam (15x report/latest)', timings) > 0) failed = true;
  }

  await new Promise((resolve) => server.close(() => resolve()));
  await db.$disconnect();
  return failed;
}

async function main() {
  runCalendarBenchmark();
  const requestsFailed = await runRequestBurstBenchmark();
  console.log(requestsFailed ? '\nCLIENT STRESS TEST: FAILED (request errors observed)' : '\nCLIENT STRESS TEST: PASSED (no request errors)');
  process.exit(requestsFailed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
