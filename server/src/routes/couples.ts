import { Router } from 'express';
import { db } from '../db';
import { AuthedRequest, requireAuth } from '../auth';

export const couplesRouter = Router();

couplesRouter.use(requireAuth);

const WEEKDAY_NAMES = ['', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];

function randomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let code = '';
  for (let i = 0; i < 4; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `LOVE-${code}`;
}

export async function generateUniqueCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode();
    const existing = await db.couple.findUnique({ where: { inviteCode: code } });
    if (!existing) return code;
  }
  throw new Error('Could not generate a unique invite code');
}

export async function loadCoupleContext(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.coupleId) return null;

  const couple = await db.couple.findUnique({
    where: { id: user.coupleId },
    include: { members: { orderBy: { createdAt: 'asc' } } },
  });
  if (!couple) return null;

  const isA = couple.members[0]?.id === user.id;
  const me = isA ? couple.members[0] : couple.members[1];
  const partner = isA ? couple.members[1] : couple.members[0];

  return { couple, me: me ?? user, partner, isA };
}

// Report generation (manual or scheduled) needs somewhere to store the
// result, and `WeeklyReport` hangs off a couple — so a solo user (never
// paired, or a partner who left) silently gets their own single-member
// couple the first time they touch report settings or generation. Same
// shape `POST /` creates, just auto-triggered instead of requiring a visit
// to the invite screen first.
export async function ensureCoupleContext(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  if (!user.coupleId) {
    const inviteCode = await generateUniqueCode();
    const couple = await db.couple.create({ data: { inviteCode } });
    await db.user.update({ where: { id: user.id }, data: { coupleId: couple.id } });
    return { couple, me: { ...user, coupleId: couple.id }, partner: null, isA: true };
  }

  return loadCoupleContext(userId);
}

couplesRouter.post('/', async (req: AuthedRequest, res) => {
  const user = await db.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (user.coupleId) {
    const couple = await db.couple.findUnique({ where: { id: user.coupleId } });
    res.json({ id: couple!.id, inviteCode: couple!.inviteCode });
    return;
  }

  const inviteCode = await generateUniqueCode();
  const couple = await db.couple.create({ data: { inviteCode } });
  await db.user.update({ where: { id: user.id }, data: { coupleId: couple.id } });

  res.status(201).json({ id: couple.id, inviteCode: couple.inviteCode });
});

couplesRouter.post('/join', async (req: AuthedRequest, res) => {
  const { code } = req.body as { code?: string };
  if (!code) {
    res.status(400).json({ error: 'code обязателен' });
    return;
  }

  const user = await db.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const couple = await db.couple.findUnique({
    where: { inviteCode: code.trim().toUpperCase() },
    include: { members: true },
  });
  if (!couple) {
    res.status(404).json({ error: 'Код приглашения не найден' });
    return;
  }

  const alreadyMember = couple.members.some((m) => m.id === user.id);
  if (alreadyMember) {
    res.json({ id: couple.id, inviteCode: couple.inviteCode });
    return;
  }

  if (user.coupleId) {
    res.status(409).json({ error: 'Вы уже состоите в паре' });
    return;
  }

  const otherMembers = couple.members.filter((m) => m.id !== user.id);
  if (otherMembers.length >= 2) {
    res.status(409).json({ error: 'В этой паре уже два участника' });
    return;
  }

  await db.user.update({ where: { id: user.id }, data: { coupleId: couple.id } });
  res.json({ id: couple.id, inviteCode: couple.inviteCode });

  if (otherMembers.length > 0) {
    db.notification
      .createMany({
        data: otherMembers.map((other) => ({
          userId: other.id,
          type: 'partner_joined',
          message: `${user.name} присоединил(-ась) к вам в Together 💞`,
        })),
      })
      .catch((err) => console.error('Failed to notify of partner joining', err));
  }
});

couplesRouter.post('/leave', async (req: AuthedRequest, res) => {
  const user = await db.user.findUnique({ where: { id: req.userId } });
  if (!user?.coupleId) {
    res.status(400).json({ error: 'Вы не состоите в паре' });
    return;
  }

  // The other side didn't initiate this and has no other way to find out —
  // leave them a persistent notification before the pairing (and with it,
  // the only link back to who they were paired with) is gone.
  const others = await db.user.findMany({
    where: { coupleId: user.coupleId, id: { not: user.id } },
  });
  if (others.length > 0) {
    await db.notification.createMany({
      data: others.map((other) => ({
        userId: other.id,
        type: 'partner_left',
        message: `${user.name} покинул(а) вашу пару в Together.`,
      })),
    });
  }

  // Dissolve the pairing for both members, not just the caller — otherwise the
  // partner is left believing they're still paired with someone who's gone.
  await db.user.updateMany({ where: { coupleId: user.coupleId }, data: { coupleId: null } });
  res.status(204).send();
});

// Read-only: uses loadCoupleContext (not ensureCoupleContext) so that simply
// viewing settings never silently enrolls a coupleless user into a brand-new
// solo couple — that used to make "reconnect with a partner" screens think
// the user was already paired after nothing but a Home tab visit.
couplesRouter.get('/settings', async (req: AuthedRequest, res) => {
  const user = await db.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    res.status(404).json({ error: 'Пользователь не найден' });
    return;
  }

  const ctx = await loadCoupleContext(req.userId!);
  if (!ctx) {
    res.json({
      reportWeekday: 1,
      reportHour: 9,
      reportTimezone: 'UTC',
      notificationsEnabled: false,
      partnerActivityNotificationsEnabled: false,
      coupleCreatedAt: null,
      lastReportAt: null,
    });
    return;
  }
  const { couple } = ctx;

  const lastReport = await db.weeklyReport.findFirst({
    where: { coupleId: couple.id },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  res.json({
    reportWeekday: couple.reportWeekday,
    reportHour: couple.reportHour,
    reportTimezone: couple.reportTimezone,
    notificationsEnabled: couple.notificationsEnabled,
    partnerActivityNotificationsEnabled: couple.partnerActivityNotificationsEnabled,
    coupleCreatedAt: couple.createdAt.toISOString(),
    lastReportAt: lastReport?.createdAt.toISOString() ?? null,
  });
});

interface CoupleSettingsBody {
  reportWeekday?: number;
  reportHour?: number;
  reportTimezone?: string;
  notificationsEnabled?: boolean;
  partnerActivityNotificationsEnabled?: boolean;
}

const SCHEDULE_CHANGE_LIMIT = 3;
const SCHEDULE_CHANGE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

couplesRouter.patch('/settings', async (req: AuthedRequest, res) => {
  const body = req.body as CoupleSettingsBody;

  if (body.reportWeekday !== undefined && (!Number.isInteger(body.reportWeekday) || body.reportWeekday < 1 || body.reportWeekday > 7)) {
    res.status(400).json({ error: 'Некорректный день недели' });
    return;
  }
  if (body.reportHour !== undefined && (!Number.isInteger(body.reportHour) || body.reportHour < 0 || body.reportHour > 23)) {
    res.status(400).json({ error: 'Некорректное время' });
    return;
  }

  const ctx = await ensureCoupleContext(req.userId!);
  if (!ctx) {
    res.status(404).json({ error: 'Пользователь не найден' });
    return;
  }
  const { couple, me, partner } = ctx;

  const changingSchedule = body.reportWeekday !== undefined || body.reportHour !== undefined;
  let scheduleChanges: string[] = [];
  if (changingSchedule) {
    const now = Date.now();
    try {
      scheduleChanges = (JSON.parse(couple.reportScheduleChanges) as string[]).filter(
        (ts) => now - new Date(ts).getTime() < SCHEDULE_CHANGE_WINDOW_MS
      );
    } catch {
      scheduleChanges = [];
    }
    if (scheduleChanges.length >= SCHEDULE_CHANGE_LIMIT) {
      res.status(429).json({ error: 'Вы уже меняли время отчёта 3 раза за последние 7 дней. Попробуйте позже.' });
      return;
    }
    scheduleChanges = [...scheduleChanges, new Date(now).toISOString()];
  }

  const updated = await db.couple.update({
    where: { id: couple.id },
    data: {
      ...(body.reportWeekday !== undefined && { reportWeekday: body.reportWeekday }),
      ...(body.reportHour !== undefined && { reportHour: body.reportHour }),
      ...(body.reportTimezone !== undefined && { reportTimezone: body.reportTimezone }),
      ...(body.notificationsEnabled !== undefined && { notificationsEnabled: body.notificationsEnabled }),
      ...(body.partnerActivityNotificationsEnabled !== undefined && {
        partnerActivityNotificationsEnabled: body.partnerActivityNotificationsEnabled,
      }),
      ...(changingSchedule && { reportScheduleChanges: JSON.stringify(scheduleChanges) }),
    },
  });

  res.json({
    reportWeekday: updated.reportWeekday,
    reportHour: updated.reportHour,
    reportTimezone: updated.reportTimezone,
    notificationsEnabled: updated.notificationsEnabled,
    partnerActivityNotificationsEnabled: updated.partnerActivityNotificationsEnabled,
  });

  if (partner) {
    const changes: string[] = [];
    if (body.reportWeekday !== undefined) changes.push(`день отчёта на ${WEEKDAY_NAMES[body.reportWeekday]}`);
    if (body.reportHour !== undefined) changes.push(`время отчёта на ${body.reportHour}:00`);
    if (body.notificationsEnabled !== undefined) {
      changes.push(`уведомление о новом отчёте (${body.notificationsEnabled ? 'включено' : 'выключено'})`);
    }
    if (body.partnerActivityNotificationsEnabled !== undefined) {
      changes.push(`уведомление «партнёр поделился» (${body.partnerActivityNotificationsEnabled ? 'включено' : 'выключено'})`);
    }

    if (changes.length > 0) {
      db.notification
        .create({
          data: {
            userId: partner.id,
            type: 'report_settings_changed',
            message: `${me.name} изменил(а) настройки отчёта: ${changes.join(', ')}.`,
          },
        })
        .catch((err) => console.error('Failed to notify of settings change', err));
    }
  }
});
