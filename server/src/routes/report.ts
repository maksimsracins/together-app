import { Router } from 'express';
import { differenceInYears, format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { db } from '../db';
import { AuthedRequest, requireAuth } from '../auth';
import { generateWeeklyReport } from '../openai';
import { ensureCoupleContext, loadCoupleContext } from './couples';
import { EntryInput, ProfileContext } from '../types';

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
}

function toDisplayEntries(
  entries: { id: string; type: string; emotion: string; text: string; createdAt: Date; reactionEmoji: string | null }[]
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

type CoupleCtx = NonNullable<Awaited<ReturnType<typeof ensureCoupleContext>>>;

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

  const weekLabel = formatWindowLabel(windowStart, now);
  const previousNarrative = lastReport
    ? (JSON.parse(lastReport.reportJson) as { narrative?: string }).narrative
    : undefined;

  const result = await generateWeeklyReport({
    weekLabel,
    userAName: isA ? me.name : partner?.name ?? 'Партнёр',
    userBName: isA ? partner?.name ?? 'Партнёр' : me.name,
    entriesA: toEntryInput(isA ? myEntries : partnerEntries),
    entriesB: toEntryInput(isA ? partnerEntries : myEntries),
    profileA: buildProfileContext(isA ? me : partner),
    profileB: buildProfileContext(isA ? partner : me),
    previousNarrative,
  });

  const created = await db.weeklyReport.create({
    data: { coupleId: couple.id, weekId: now.toISOString(), weekLabel, reportJson: JSON.stringify(result) },
  });

  const reportedIds = [...myEntries, ...partnerEntries].map((e) => e.id);
  await db.entry.updateMany({ where: { id: { in: reportedIds } }, data: { includedInReportId: created.id } });

  return {
    status: 'ok' as const,
    generatedAt: created.createdAt.toISOString(),
    weekLabel,
    report: {
      narrative: result.narrative,
      narrativeDeep: result.narrativeDeep,
      myPlan: isA ? result.planA : result.planB,
      partnerPlan: isA ? result.planB : result.planA,
      myEntries: toDisplayEntries(myEntries),
      partnerEntries: toDisplayEntries(partnerEntries),
    },
  };
}

reportRouter.post('/generate', async (req: AuthedRequest, res) => {
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
    res.json({ weekId: result.generatedAt, weekLabel: result.weekLabel, generatedAt: result.generatedAt, report: result.report });
  } catch (err) {
    console.error('Failed to generate weekly report', err);
    res.status(502).json({ error: 'Не удалось сгенерировать отчёт' });
  }
});

reportRouter.get('/latest', async (req: AuthedRequest, res) => {
  const ctx = await loadCoupleContext(req.userId!);
  if (!ctx) {
    res.json(null);
    return;
  }
  const { couple, me, partner, isA } = ctx;

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
    weekId: latest.weekId,
    weekLabel: latest.weekLabel,
    generatedAt: latest.createdAt.toISOString(),
    report: {
      narrative: parsed.narrative,
      narrativeDeep: parsed.narrativeDeep,
      myPlan: isA ? parsed.planA : parsed.planB,
      partnerPlan: isA ? parsed.planB : parsed.planA,
      myEntries: toDisplayEntries(myEntries),
      partnerEntries: toDisplayEntries(partnerEntries),
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
    take: 30,
  });

  res.json(
    reports.map((r) => {
      const parsed = JSON.parse(r.reportJson) as { narrative?: string };
      return {
        id: r.id,
        weekId: r.weekId,
        weekLabel: r.weekLabel,
        generatedAt: r.createdAt.toISOString(),
        narrative: parsed.narrative ?? '',
      };
    })
  );
});

reportRouter.get('/history/:id', async (req: AuthedRequest, res) => {
  const ctx = await loadCoupleContext(req.userId!);
  if (!ctx) {
    res.status(404).json({ error: 'Отчёт не найден' });
    return;
  }
  const { couple, me, partner, isA } = ctx;

  const report = await db.weeklyReport.findFirst({ where: { id: req.params.id, coupleId: couple.id } });
  if (!report) {
    res.status(404).json({ error: 'Отчёт не найден' });
    return;
  }

  const { mine: myEntries, partner: partnerEntries } = await loadReportedEntries(report.id, me.id, partner?.id);
  const parsed = JSON.parse(report.reportJson);
  res.json({
    weekId: report.weekId,
    weekLabel: report.weekLabel,
    generatedAt: report.createdAt.toISOString(),
    report: {
      narrative: parsed.narrative,
      narrativeDeep: parsed.narrativeDeep,
      myPlan: isA ? parsed.planA : parsed.planB,
      partnerPlan: isA ? parsed.planB : parsed.planA,
      myEntries: toDisplayEntries(myEntries),
      partnerEntries: toDisplayEntries(partnerEntries),
    },
  });
});
