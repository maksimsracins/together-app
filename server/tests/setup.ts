import { db } from '../src/db';

afterEach(async () => {
  await db.entry.deleteMany();
  await db.weeklyReport.deleteMany();
  await db.notification.deleteMany();
  try {
    await db.user.deleteMany();
  } catch {
    // A handful of routes create notifications fire-and-forget (deliberately
    // not awaited, so a slow write never blocks the HTTP response) -- one can
    // still land after the notification wipe above but before this one, which
    // Postgres's connection pooling surfaces far more readily than SQLite
    // ever did. One retry clears whatever snuck in.
    await db.notification.deleteMany();
    await db.user.deleteMany();
  }
  await db.couple.deleteMany();
});

afterAll(async () => {
  await db.$disconnect();
});
