import { Router } from 'express';
import { differenceInYears, format } from 'date-fns';
import { db } from '../db';
import { AuthedRequest, requireAuth } from '../auth';
import { generateWeeklyReport, translateReport } from '../openai';
import { sendPushNotification } from '../push';
import { ensureCoupleContext, loadCoupleContext } from './couples';
import { EntryInput, GenerateReportResponse, ProfileContext } from '../types';
import { getWeatherSummary, localizeWeather, WeatherSummary } from '../weather';
import { Couple, User, WeeklyReport } from '@prisma/client';
import { logError } from '../sentry';
import { generateReportLimiter } from '../rateLimiters';
import { FREE_REPORT_LIMIT } from '../constants';
import { DATE_LOCALES, Lang, langOf, normalizeLang, t } from '../i18n';

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

function formatWindowLabel(start: Date, end: Date, lang: Lang) {
  const locale = DATE_LOCALES[lang];
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const startStr = format(start, sameMonth ? 'd' : 'd MMMM', { locale });
  const endStr = format(end, 'd MMMM', { locale });
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

  const members = [me, partner].filter((u): u is User => !!u);
  // Each partner gets it in their own language, even though the report
  // itself is written in the generating partner's.
  const messageFor = (u: User) => t(normalizeLang(u.language), 'notifReportReady');
  await db.notification.createMany({
    data: members.map((u) => ({ userId: u.id, type: 'report_ready', message: messageFor(u) })),
  });

  const recipients = members.filter((u) => !!u.pushToken);
  console.log(`Sending report-ready push for couple ${couple.id} to ${recipients.length} recipient(s)`);
  await Promise.all(
    recipients.map((u) => sendPushNotification(u.pushToken!, 'Together', messageFor(u), { type: 'report_ready' }))
  );
}

// Shared by the manual "/generate" route and the background scheduler — loads
// whatever's accumulated since the couple's last report (or since the couple
// was created, if this is the first one), and skips quietly if there's
// nothing new to say yet.
// The report is shared by both partners but generated once, in the language
// of whoever generates it (`me` -- for scheduled reports, the couple's first
// member).
export async function runReportGeneration(ctx: CoupleCtx) {
  const { couple, me, partner, isA } = ctx;
  const lang = normalizeLang(me.language);

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

  const weekLabel = formatWindowLabel(windowStart, now, lang);
  const previousNarrative = lastReport
    ? (JSON.parse(lastReport.reportJson) as { narrative?: string }).narrative
    : undefined;

  const [weatherMe, weatherPartner] = await Promise.all([
    getWeatherSummary(me.city, windowStart, now, lang),
    partner ? getWeatherSummary(partner.city, windowStart, now, lang) : Promise.resolve(null),
  ]);

  const partnerName = partner?.name ?? t(lang, 'partnerFallbackName');
  const result = await generateWeeklyReport({
    language: lang,
    weekLabel,
    userAName: isA ? me.name : partnerName,
    userBName: isA ? partnerName : me.name,
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
      language: lang,
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
    res.status(404).json({ error: t(langOf(req), 'userNotFound') });
    return;
  }

  try {
    const result = await runReportGeneration(ctx);
    if (result.status === 'empty') {
      res.status(409).json({ error: t(langOf(req), 'reportNeedsEntry') });
      return;
    }
    if (result.status === 'limit_reached') {
      res.status(402).json({ error: t(langOf(req), 'reportLimitReached') });
      return;
    }
    res.json({ id: result.id, weekId: result.generatedAt, weekLabel: result.weekLabel, generatedAt: result.generatedAt, report: result.report });

    notifyCoupleReportReady(ctx.couple, ctx.me, ctx.partner).catch((err) =>
      logError('Failed to notify couple of new report', err)
    );
  } catch (err) {
    logError('Failed to generate weekly report', err);
    res.status(502).json({ error: t(langOf(req), 'reportGenerationFailed') });
  }
});

// A stored report is shared by both partners but written in one language.
// Each reader gets it in their own: the original when it matches, otherwise
// a translation made on first view and cached (translations don't count
// toward the couple's free report quota).
const pendingTranslations = new Map<string, Promise<GenerateReportResponse>>();

function reportText(parsed: Partial<GenerateReportResponse>): GenerateReportResponse {
  return {
    narrative: parsed.narrative ?? '',
    insight: parsed.insight ?? '',
    appreciationHighlight: parsed.appreciationHighlight ?? '',
    loveMapNote: parsed.loveMapNote ?? '',
  };
}

async function reportTextIn(report: WeeklyReport, lang: Lang): Promise<GenerateReportResponse> {
  const original = reportText(JSON.parse(report.reportJson));
  if (normalizeLang(report.language) === lang) return original;

  const cached = await db.reportTranslation.findUnique({
    where: { reportId_language: { reportId: report.id, language: lang } },
  });
  if (cached) return reportText(JSON.parse(cached.reportJson));

  const key = `${report.id}:${lang}`;
  let pending = pendingTranslations.get(key);
  if (!pending) {
    pending = (async () => {
      const translated = reportText(await translateReport(original, lang));
      await db.reportTranslation.upsert({
        where: { reportId_language: { reportId: report.id, language: lang } },
        create: { reportId: report.id, language: lang, reportJson: JSON.stringify(translated) },
        update: {},
      });
      return translated;
    })().finally(() => pendingTranslations.delete(key));
    pendingTranslations.set(key, pending);
  }

  try {
    return await pending;
  } catch (err) {
    // Better the report in its original language than no report at all;
    // the next view retries.
    logError(`Failed to translate report ${report.id} to ${lang}`, err);
    return original;
  }
}

// The stored weekLabel is in the generating partner's language, so for
// anyone else it's rebuilt from the window: previous report (or couple
// creation) up to this report.
function weekLabelIn(report: WeeklyReport, windowStart: Date, lang: Lang) {
  return normalizeLang(report.language) === lang
    ? report.weekLabel
    : formatWindowLabel(windowStart, report.createdAt, lang);
}

async function previousReportDate(report: WeeklyReport, couple: Couple) {
  const prev = await db.weeklyReport.findFirst({
    where: { coupleId: report.coupleId, createdAt: { lt: report.createdAt } },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  return prev?.createdAt ?? couple.createdAt;
}

async function presentReport(report: WeeklyReport, ctx: CoupleCtx) {
  const { couple, me, partner } = ctx;
  const lang = normalizeLang(me.language);
  const [text, windowStart, entries] = await Promise.all([
    reportTextIn(report, lang),
    previousReportDate(report, couple),
    loadReportedEntries(report.id, me.id, partner?.id),
  ]);
  const weather = resolveWeather(JSON.parse(report.reportJson), me.id, partner?.id);
  return {
    id: report.id,
    weekId: report.weekId,
    weekLabel: weekLabelIn(report, windowStart, lang),
    generatedAt: report.createdAt.toISOString(),
    report: {
      ...text,
      myEntries: toDisplayEntries(entries.mine),
      partnerEntries: toDisplayEntries(entries.partner),
      weather: { mine: localizeWeather(weather.mine, lang), partner: localizeWeather(weather.partner, lang) },
    },
  };
}

reportRouter.get('/latest', async (req: AuthedRequest, res) => {
  const ctx = await loadCoupleContext(req.userId!);
  if (!ctx) {
    res.json(null);
    return;
  }

  const latest = await db.weeklyReport.findFirst({
    where: { coupleId: ctx.couple.id },
    orderBy: { createdAt: 'desc' },
  });
  if (!latest) {
    res.json(null);
    return;
  }

  res.json(await presentReport(latest, ctx));
});

reportRouter.get('/history', async (req: AuthedRequest, res) => {
  const ctx = await loadCoupleContext(req.userId!);
  if (!ctx) {
    res.json([]);
    return;
  }
  const lang = normalizeLang(ctx.me.language);
  const reports = await db.weeklyReport.findMany({
    where: { coupleId: ctx.couple.id },
    orderBy: { createdAt: 'asc' },
  });
  const rows = reports.map((r, i) => ({
    id: r.id,
    weekLabel: weekLabelIn(r, i > 0 ? reports[i - 1].createdAt : ctx.couple.createdAt, lang),
    generatedAt: r.createdAt.toISOString(),
  }));
  res.json(rows.reverse());
});

reportRouter.get('/history/:id', async (req: AuthedRequest, res) => {
  const ctx = await loadCoupleContext(req.userId!);
  if (!ctx) {
    res.status(404).json({ error: t(langOf(req), 'coupleNotFound') });
    return;
  }

  const report = await db.weeklyReport.findFirst({ where: { id: req.params.id, coupleId: ctx.couple.id } });
  if (!report) {
    res.status(404).json({ error: t(langOf(req), 'reportNotFound') });
    return;
  }

  res.json(await presentReport(report, ctx));
});
