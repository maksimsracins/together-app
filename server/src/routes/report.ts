import { Router } from 'express';
import { differenceInYears, format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { db } from '../db';
import { AuthedRequest, requireAuth } from '../auth';
import { generateWeeklyReport } from '../openai';
import { sendPushNotification } from '../push';
import { ensureCoupleContext, loadCoupleContext } from './couples';
import { EntryInput, ProfileContext } from '../types';
import { getWeatherSummary, WeatherSummary } from '../weather';
import { Couple, User } from '@prisma/client';
import { logError } from '../sentry';
import { generateReportLimiter } from '../rateLimiters';
import { FREE_REPORT_LIMIT } from '../constants';

export const reportRouter = Router();

reportRouter.use(requireAuth);

function toEntryInput(
  entries: { type: string; emotion: string; text: string; tags: string; createdAt: Date }[]
): EntryInput[] {
  return entries.map((e) => ({
    type: e.type as EntryInput['type'],
    emotion: e.emotion as EntryInput['emotion'],
    text: e.text,
    tags: JSON.parse(e.tags) as string[],
    createdAt: e.createdAt.toISOString(),
  }));
}

interface DisplayEntry {
  id: string;
  type: string;
  emotion: string;
  text: string;
  createdAt: string;
  reactionEmoji: string | null;
  hasPhoto: boolean;
  hasAudio: boolean;
}

function toDisplayEntries(
  entries: {
    id: string;
    type: string;
    emotion: string;
    text: string;
    createdAt: Date;
    reactionEmoji: string | null;
    hasPhoto: boolean;
    hasAudio: boolean;
  }[]
): DisplayEntry[] {
  return entries
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((e) => ({
      id: e.id,
      type: e.type,
      emotion: e.emotion,
      text: e.text,
      createdAt: e.createdAt.toISOString(),
      reactionEmoji: e.reactionEmoji,
      hasPhoto: e.hasPhoto,
      hasAudio: e.hasAudio,
    }));
}

// `includedInReportId: null` is the authoritative guarantee that an entry never
// surfaces in two reports — the createdAt window is just the natural bound on
// top (entries created before the couple's very first report never got a
// window at all, so the flag alone must do the filtering there).
async function loadUnreportedEntries(meId: string, partnerId: string | undefined | null, gte: Date) {
  const where = { createdAt: { gte }, includedInReportId: null };
  const [mine, partner] = await Promise.all([
    db.entry.findMany({ where: { ...where, userId: meId } }),
    partnerId ? db.entry.findMany({ where: { ...where, userId: partnerId } }) : Promise.resolve([]),
  ]);
  return { mine, partner };
}

async function loadReportedEntries(reportId: string, meId: string, partnerId: string | undefined | null) {
  const entries = await db.entry.findMany({ where: { includedInReportId: reportId } });
  return {
    mine: entries.filter((e) => e.userId === meId),
    partner: partnerId ? entries.filter((e) => e.userId === partnerId) : [],
  };
}

function buildProfileContext(
  user: { birthdate: Date | null; occupation: string | null; habits: string | null } | null | undefined
): ProfileContext {
  if (!user) return {};
  return {
    age: user.birthdate ? differenceInYears(new Date(), user.birthdate) : undefined,
    occupation: user.occupation ?? undefined,
    habits: user.habits ?? undefined,
  };
}

function formatWindowLabel(start: Date, end: Date) {
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const startStr = format(start, sameMonth ? 'd' : 'd MMMM', { locale: ru });
  const endStr = format(end, 'd MMMM', { locale: ru });
  return `${startStr} – ${endStr}`;
}

function formatWeatherForPrompt(w: WeatherSummary | null): string | undefined {
  return w ? `${w.condition}, ${w.minTemp}–${w.maxTemp}°C` : undefined;
}

// Weather is captured once at generation time (keyed by user id, since the
// same stored report is later viewed by either partner and "mine" flips
// depending on who's asking) and read back unchanged afterwards -- it
// describes what the weather actually was during that period, not "now".
function resolveWeather(
  reportJson: { weatherByUserId?: Record<string, WeatherSummary | null> },
  meId: string,
  partnerId: string | undefined | null
) {
  const map = reportJson.weatherByUserId ?? {};
  return {
    mine: map[meId] ?? null,
    partner: partnerId ? map[partnerId] ?? null : null,
  };
}

type CoupleCtx = NonNullable<Awaited<ReturnType<typeof ensureCoupleContext>>>;

// Off by default: isPremium never becomes true today (no StoreKit wiring
// yet), so flipping this on before subscriptions exist would permanently
// block every couple after their first report. Read fresh (not cached at
// module load) so it can be toggled without a server restart.
function reportQuotaEnforced() {
  return process.env.ENFORCE_REPORT_QUOTA === 'true';
}

// Both partners share one report, so both get notified when it's ready —
// regardless of whether it was generated automatically or by one of them
// tapping "Обновить".
export async function notifyCoupleReportReady(couple: Couple, me: User, partner: User | null) {
  if (!couple.notificationsEnabled) {
    console.log(`Skipping report-ready notification for couple ${couple.id}: notificationsEnabled is off`);
    return;
  }

  const message = 'Ваш новый отчёт готов 💞';
  const members = [me, partner].filter((u): u is User => !!u);
  await db.notification.createMany({
    data: members.map((u) => ({ userId: u.id, type: 'report_ready', message })),
  });

  const recipients = members.filter((u) => !!u.pushToken);
  console.log(`Sending report-ready push for couple ${couple.id} to ${recipients.length} recipient(s)`);
  await Promise.all(
    recipients.map((u) => sendPushNotification(u.pushToken!, 'Together', message, { type: 'report_ready' }))
  );
}

// Shared by the manual "/generate" route and the background scheduler — loads
// whatever's accumulated since the couple's last report (or since the couple
// was created, if this is the first one), and skips quietly if there's
// nothing new to say yet.
export async function runReportGeneration(ctx: CoupleCtx) {
  const { couple, me, partner, isA } = ctx;

  const lastReport = await db.weeklyReport.findFirst({
    where: { coupleId: couple.id },
    orderBy: { createdAt: 'desc' },
  });
  const windowStart = lastReport?.createdAt ?? couple.createdAt;
  const now = new Date();

  const { mine: myEntries, partner: partnerEntries } = await loadUnreportedEntries(me.id, partner?.id, windowStart);

  if (myEntries.length === 0 && partnerEntries.length === 0) {
    return { status: 'empty' as const };
  }

  if (reportQuotaEnforced() && !couple.isPremium && couple.freeReportsUsed >= FREE_REPORT_LIMIT) {
    return { status: 'limit_reached' as const };
  }

  const weekLabel = formatWindowLabel(windowStart, now);
  const previousNarrative = lastReport
    ? (JSON.parse(lastReport.reportJson) as { narrative?: string }).narrative
    : undefined;

  const [weatherMe, weatherPartner] = await Promise.all([
    getWeatherSummary(me.city, windowStart, now),
    partner ? getWeatherSummary(partner.city, windowStart, now) : Promise.resolve(null),
  ]);

  const result = await generateWeeklyReport({
    weekLabel,
    userAName: isA ? me.name : partner?.name ?? 'Партнёр',
    userBName: isA ? partner?.name ?? 'Партнёр' : me.name,
    entriesA: toEntryInput(isA ? myEntries : partnerEntries),
    entriesB: toEntryInput(isA ? partnerEntries : myEntries),
    profileA: buildProfileContext(isA ? me : partner),
    profileB: buildProfileContext(isA ? partner : me),
    previousNarrative,
    weatherA: formatWeatherForPrompt(isA ? weatherMe : weatherPartner),
    weatherB: formatWeatherForPrompt(isA ? weatherPartner : weatherMe),
  });

  const weatherByUserId: Record<string, WeatherSummary | null> = { [me.id]: weatherMe };
  if (partner) weatherByUserId[partner.id] = weatherPartner;

  const created = await db.weeklyReport.create({
    data: {
      coupleId: couple.id,
      weekId: now.toISOString(),
      weekLabel,
      reportJson: JSON.stringify({ ...result, weatherByUserId }),
    },
  });

  const reportedIds = [...myEntries, ...partnerEntries].map((e) => e.id);
  await db.entry.updateMany({ where: { id: { in: reportedIds } }, data: { includedInReportId: created.id } });

  if (!couple.isPremium) {
    await db.couple.update({ where: { id: couple.id }, data: { freeReportsUsed: { increment: 1 } } });
  }

  return {
    status: 'ok' as const,
    id: created.id,
    generatedAt: created.createdAt.toISOString(),
    weekLabel,
    report: {
      narrative: result.narrative,
      insight: result.insight,
      appreciationHighlight: result.appreciationHighlight,
      loveMapNote: result.loveMapNote,
      myEntries: toDisplayEntries(myEntries),
      partnerEntries: toDisplayEntries(partnerEntries),
      weather: { mine: weatherMe, partner: weatherPartner },
    },
  };
}

// Manual trigger, kept for testing report generation without waiting for the
// scheduler -- not exposed anywhere in the normal client UI flow.
reportRouter.post('/generate', generateReportLimiter, async (req: AuthedRequest, res) => {
  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the server' });
    return;
  }

  const ctx = await ensureCoupleContext(req.userId!);
  if (!ctx) {
    res.status(404).json({ error: 'Пользователь не найден' });
    return;
  }

  try {
    const result = await runReportGeneration(ctx);
    if (result.status === 'empty') {
      res.status(409).json({ error: 'Добавьте хотя бы одну запись, чтобы получить отчёт' });
      return;
    }
    if (result.status === 'limit_reached') {
      res.status(402).json({ error: 'Бесплатные отчёты закончились. Оформите подписку Together Plus.' });
      return;
    }
    res.json({ id: result.id, weekId: result.generatedAt, weekLabel: result.weekLabel, generatedAt: result.generatedAt, report: result.report });

    notifyCoupleReportReady(ctx.couple, ctx.me, ctx.partner).catch((err) =>
      logError('Failed to notify couple of new report', err)
    );
  } catch (err) {
    logError('Failed to generate weekly report', err);
    res.status(502).json({ error: 'Не удалось сгенерировать отчёт' });
  }
});

reportRouter.get('/latest', async (req: AuthedRequest, res) => {
  const ctx = await loadCoupleContext(req.userId!);
  if (!ctx) {
    res.json(null);
    return;
  }
  const { couple, me, partner } = ctx;

  const latest = await db.weeklyReport.findFirst({
    where: { coupleId: couple.id },
    orderBy: { createdAt: 'desc' },
  });
  if (!latest) {
    res.json(null);
    return;
  }

  const { mine: myEntries, partner: partnerEntries } = await loadReportedEntries(latest.id, me.id, partner?.id);
  const parsed = JSON.parse(latest.reportJson);
  res.json({
    id: latest.id,
    weekId: latest.weekId,
    weekLabel: latest.weekLabel,
    generatedAt: latest.createdAt.toISOString(),
    report: {
      narrative: parsed.narrative,
      insight: parsed.insight ?? '',
      appreciationHighlight: parsed.appreciationHighlight ?? '',
      loveMapNote: parsed.loveMapNote ?? '',
      myEntries: toDisplayEntries(myEntries),
      partnerEntries: toDisplayEntries(partnerEntries),
      weather: resolveWeather(parsed, me.id, partner?.id),
    },
  });
});

reportRouter.get('/history', async (req: AuthedRequest, res) => {
  const ctx = await loadCoupleContext(req.userId!);
  if (!ctx) {
    res.json([]);
    return;
  }
  const reports = await db.weeklyReport.findMany({
    where: { coupleId: ctx.couple.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(reports.map((r) => ({ id: r.id, weekLabel: r.weekLabel, generatedAt: r.createdAt.toISOString() })));
});

reportRouter.get('/history/:id', async (req: AuthedRequest, res) => {
  const ctx = await loadCoupleContext(req.userId!);
  if (!ctx) {
    res.status(404).json({ error: 'Пара не найдена' });
    return;
  }
  const { couple, me, partner } = ctx;

  const report = await db.weeklyReport.findFirst({ where: { id: req.params.id, coupleId: couple.id } });
  if (!report) {
    res.status(404).json({ error: 'Отчёт не найден' });
    return;
  }

  const { mine: myEntries, partner: partnerEntries } = await loadReportedEntries(report.id, me.id, partner?.id);
  const parsed = JSON.parse(report.reportJson);
  res.json({
    id: report.id,
    weekId: report.weekId,
    weekLabel: report.weekLabel,
    generatedAt: report.createdAt.toISOString(),
    report: {
      narrative: parsed.narrative,
      insight: parsed.insight ?? '',
      appreciationHighlight: parsed.appreciationHighlight ?? '',
      loveMapNote: parsed.loveMapNote ?? '',
      myEntries: toDisplayEntries(myEntries),
      partnerEntries: toDisplayEntries(partnerEntries),
      weather: resolveWeather(parsed, me.id, partner?.id),
    },
  });
});
