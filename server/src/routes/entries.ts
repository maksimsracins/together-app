import { Router } from 'express';
import { db } from '../db';
import { AuthedRequest, requireAuth } from '../auth';
import { serializeEntry, serializeEntryListItem } from '../serializers';
import { weekIdFor } from '../week';
import { sendPushNotification } from '../push';
import { logError } from '../sentry';

export const entriesRouter = Router();

entriesRouter.use(requireAuth);

const ENTRY_TYPES = ['worry', 'joy', 'gratitude', 'wish', 'thought'];
const EMOTIONS = ['joy', 'sadness', 'irritation', 'anxiety', 'love', 'hurt', 'calm', 'doubt', 'gratitude'];

const MAX_PHOTO_DATA_URI_LENGTH = 5 * 1024 * 1024; // ~3.5MB of actual image data, base64-inflated

interface EntryBody {
  type?: string;
  emotion?: string;
  text?: string;
  tags?: string[];
  hasAudio?: boolean;
  photoUri?: string | null;
}

function validateEntryBody(body: EntryBody): string | null {
  if (!body.type || !ENTRY_TYPES.includes(body.type)) return 'Некорректный тип записи';
  if (!body.emotion || !EMOTIONS.includes(body.emotion)) return 'Некорректная эмоция';
  if (!body.text || !body.text.trim()) return 'Текст записи обязателен';
  if (body.text.length > 1000) return 'Текст не может быть длиннее 1000 символов';
  if (body.photoUri) {
    if (!body.photoUri.startsWith('data:image/')) return 'Некорректный формат фото';
    if (body.photoUri.length > MAX_PHOTO_DATA_URI_LENGTH) return 'Фото слишком большое';
  }
  return null;
}

entriesRouter.get('/', async (req: AuthedRequest, res) => {
  const all = req.query.all === 'true';
  const weekId = (req.query.weekId as string | undefined) ?? weekIdFor();
  const entries = await db.entry.findMany({
    where: { userId: req.userId, ...(all ? {} : { weekId }) },
    orderBy: { createdAt: 'desc' },
  });
  // `all=true` spans a user's entire history and is fetched on every Calendar
  // focus -- with photoUri that turns into hundreds of MB for anyone with
  // more than a handful of photos. A single week's worth is naturally bounded,
  // so only the unbounded query needs the lighter serializer.
  res.json(entries.map(all ? serializeEntryListItem : serializeEntry));
});

entriesRouter.get('/partner', async (req: AuthedRequest, res) => {
  const user = await db.user.findUnique({ where: { id: req.userId } });
  if (!user?.coupleId) {
    res.json([]);
    return;
  }

  const partner = await db.user.findFirst({ where: { coupleId: user.coupleId, id: { not: user.id } } });
  if (!partner) {
    res.json([]);
    return;
  }

  // Entries only ever surface to the partner via a generated report — once
  // that's happened they're meant to stay visible for good (otherwise they'd
  // only ever be reachable through whatever the *latest* report's window
  // happens to be, and scroll out of reach the moment a newer report is
  // generated). "Unlocked" = created at or before the latest report, since
  // report windows are contiguous from the couple's very first one.
  const latestReport = await db.weeklyReport.findFirst({
    where: { coupleId: user.coupleId },
    orderBy: { createdAt: 'desc' },
  });
  if (!latestReport) {
    res.json([]);
    return;
  }

  const entries = await db.entry.findMany({
    where: { userId: partner.id, createdAt: { lte: latestReport.createdAt } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(entries.map(serializeEntryListItem));
});

// Full detail for one entry, photo included -- fetched on demand only when
// actually opening it (from the calendar's day list or to edit), instead of
// paying the photoUri cost for every entry on every list fetch.
entriesRouter.get('/:id', async (req: AuthedRequest, res) => {
  const entry = await db.entry.findUnique({ where: { id: req.params.id } });
  if (!entry || entry.userId !== req.userId) {
    res.status(404).json({ error: 'Запись не найдена' });
    return;
  }
  res.json(serializeEntry(entry));
});

// A lighter-weight signal than /partner: just which dates your partner wrote
// something on, no text, no report-unlock gating. Mirrors what the
// "partner_entry" push notification already reveals (that they shared
// something, never what) -- so a calendar dot for the same event isn't new
// exposure, it's the same fact shown a different way.
entriesRouter.get('/partner/activity', async (req: AuthedRequest, res) => {
  const user = await db.user.findUnique({ where: { id: req.userId } });
  if (!user?.coupleId) {
    res.json({ createdAts: [] });
    return;
  }

  const partner = await db.user.findFirst({ where: { coupleId: user.coupleId, id: { not: user.id } } });
  if (!partner) {
    res.json({ createdAts: [] });
    return;
  }

  const entries = await db.entry.findMany({
    where: { userId: partner.id },
    select: { createdAt: true },
  });
  // Raw timestamps, not server-bucketed dates -- the client already buckets
  // entries into calendar days in local time (isSameDay), and truncating to
  // a UTC date string here would drift a day near midnight in most timezones.
  res.json({ createdAts: entries.map((e) => e.createdAt.toISOString()) });
});

entriesRouter.post('/', async (req: AuthedRequest, res) => {
  const body = req.body as EntryBody;
  const error = validateEntryBody(body);
  if (error) {
    res.status(400).json({ error });
    return;
  }

  const user = await db.user.findUnique({ where: { id: req.userId } });
  const entry = await db.entry.create({
    data: {
      userId: req.userId!,
      coupleId: user?.coupleId ?? null,
      type: body.type!,
      emotion: body.emotion!,
      text: body.text!.trim(),
      tags: JSON.stringify(body.tags ?? []),
      hasPhoto: !!body.photoUri,
      hasAudio: body.hasAudio ?? false,
      photoUri: body.photoUri ?? null,
      weekId: weekIdFor(),
    },
  });

  res.status(201).json(serializeEntry(entry));

  // Fire-and-forget: never let a notification failure affect the entry response.
  if (user?.coupleId) {
    notifyPartnerOfNewEntry(user.coupleId, user.id, user.name).catch((err) =>
      logError('Failed to notify partner of new entry', err)
    );
  }
});

async function notifyPartnerOfNewEntry(coupleId: string, authorId: string, authorName: string) {
  const couple = await db.couple.findUnique({ where: { id: coupleId } });
  if (!couple?.partnerActivityNotificationsEnabled) {
    console.log(`Skipping partner-entry notification for couple ${coupleId}: partnerActivityNotificationsEnabled is off`);
    return;
  }

  const partner = await db.user.findFirst({ where: { coupleId, id: { not: authorId } } });
  if (!partner) return;

  const message = `${authorName} поделился(-ась) чем-то новым 💌`;
  await db.notification.create({ data: { userId: partner.id, type: 'partner_entry', message } });

  if (!partner.pushToken) {
    console.log(`Skipping partner-entry push for couple ${coupleId}: partner has no pushToken`);
    return;
  }
  await sendPushNotification(partner.pushToken, 'Together', message, { type: 'partner_entry' });
}

entriesRouter.patch('/:id', async (req: AuthedRequest, res) => {
  const existing = await db.entry.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.userId) {
    res.status(404).json({ error: 'Запись не найдена' });
    return;
  }
  if (existing.includedInReportId) {
    res.status(409).json({ error: 'Эта запись уже вошла в отчёт — изменить её нельзя' });
    return;
  }

  const body = req.body as EntryBody;
  const error = validateEntryBody(body);
  if (error) {
    res.status(400).json({ error });
    return;
  }

  const entry = await db.entry.update({
    where: { id: existing.id },
    data: {
      type: body.type!,
      emotion: body.emotion!,
      text: body.text!.trim(),
      tags: JSON.stringify(body.tags ?? []),
      hasPhoto: !!body.photoUri,
      hasAudio: body.hasAudio ?? false,
      photoUri: body.photoUri ?? null,
    },
  });

  res.json(serializeEntry(entry));
});

entriesRouter.patch('/:id/reaction', async (req: AuthedRequest, res) => {
  const { emoji } = req.body as { emoji?: string | null };
  const existing = await db.entry.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'Запись не найдена' });
    return;
  }

  // You can always react to your own entry; reacting to someone else's is only
  // allowed if they're currently your partner (checked live via User.coupleId,
  // not the entry's own coupleId snapshot — an entry written before pairing
  // never got one, but it can still surface in today's report).
  if (existing.userId !== req.userId) {
    const [me, author] = await Promise.all([
      db.user.findUnique({ where: { id: req.userId } }),
      db.user.findUnique({ where: { id: existing.userId } }),
    ]);
    const sameCouple = me?.coupleId && author?.coupleId && me.coupleId === author.coupleId;
    if (!sameCouple) {
      res.status(404).json({ error: 'Запись не найдена' });
      return;
    }
  }

  const entry = await db.entry.update({
    where: { id: existing.id },
    data: { reactionEmoji: emoji ?? null },
  });
  res.json({ id: entry.id, reactionEmoji: entry.reactionEmoji });
});

entriesRouter.delete('/:id', async (req: AuthedRequest, res) => {
  const existing = await db.entry.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.userId) {
    res.status(404).json({ error: 'Запись не найдена' });
    return;
  }
  if (existing.includedInReportId) {
    res.status(409).json({ error: 'Эта запись уже вошла в отчёт — удалить её нельзя' });
    return;
  }
  await db.entry.delete({ where: { id: existing.id } });
  res.status(204).send();
});
