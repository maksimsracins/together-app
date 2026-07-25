import { db } from '../src/db';

afterEach(async () => {
  await db.entry.deleteMany();
  await db.weeklyReport.deleteMany();
  await db.notification.deleteMany();
  await db.user.deleteMany();
  await db.couple.deleteMany();
});

afterAll(async () => {
  await db.$disconnect();
});
