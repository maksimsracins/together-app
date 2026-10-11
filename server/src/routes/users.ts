import { Router } from 'express';
import { db } from '../db';
import { AuthedRequest, requireAuth } from '../auth';
import { serializeUser, serializeEntry, serializeNotification } from '../serializers';
import { isLang, langOf, normalizeLang, t } from '../i18n';

export const usersRouter = Router();

usersRouter.use(requireAuth);

const MAX_AVATAR_DATA_URI_LENGTH = 5 * 1024 * 1024; // ~3.5MB of actual image data, base64-inflated
const MAX_NAME_LENGTH = 20;
const LANGUAGE_CHANGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// Builds from before multi-language support still send love languages as
// their Russian display labels -- store everything as the stable keys the
// current client translates at render time.
const LEGACY_LOVE_LANGUAGE_KEYS: Record<string, string> = {
  'Слова поддержки': 'words',
  'Совместное время': 'time',
  'Подарки': 'gifts',
  'Помощь по дому': 'service',
  'Прикосновения': 'touch',
};

function normalizeLoveLanguages(values: string[]) {
  return values.map((v) => LEGACY_LOVE_LANGUAGE_KEYS[v] ?? v);
}

usersRouter.get('/me', async (req: AuthedRequest, res) => {
  const user = await db.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    res.status(404).json({ error: t(langOf(req), 'userNotFound') });
    return;
  }
  res.json(serializeUser(user));
});

interface UpdateProfileBody {
  name?: string;
  avatarEmoji?: string;
  avatarUri?: string | null;
  relationshipStartDate?: string | null;
  loveLanguages?: string[];
  interests?: string[];
  timezone?: string;
  language?: string;
  birthdate?: string | null;
  occupation?: string | null;
  habits?: string | null;
  city?: string | null;
  journalReminderEnabled?: boolean;
}

usersRouter.patch('/me', async (req: AuthedRequest, res) => {
  const body = req.body as UpdateProfileBody;
  const lang = langOf(req);

  if (body.name !== undefined && body.name.trim().length > MAX_NAME_LENGTH) {
    res.status(400).json({ error: t(lang, 'nameTooLong', { max: MAX_NAME_LENGTH }) });
    return;
  }

  if (body.avatarUri) {
    if (!body.avatarUri.startsWith('data:image/')) {
      res.status(400).json({ error: t(lang, 'invalidPhotoFormat') });
      return;
    }
    if (body.avatarUri.length > MAX_AVATAR_DATA_URI_LENGTH) {
      res.status(400).json({ error: t(lang, 'photoTooLarge') });
      return;
    }
  }

  if (body.language !== undefined && !isLang(body.language)) {
    res.status(400).json({ error: t(lang, 'unsupportedLanguage') });
    return;
  }

  // Switching language translates every past report the user opens, so it is
  // limited to once a day.
  let languageChanged = false;
  if (body.language !== undefined) {
    const current = await db.user.findUnique({
      where: { id: req.userId },
      select: { language: true, languageChangedAt: true },
    });
    languageChanged = !!current && current.language !== body.language;
    if (
      languageChanged &&
      current?.languageChangedAt &&
      Date.now() - current.languageChangedAt.getTime() < LANGUAGE_CHANGE_COOLDOWN_MS
    ) {
      res.status(429).json({ error: t(lang, 'languageChangeLimit') });
      return;
    }
  }

  const user = await db.user.update({
    where: { id: req.userId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.avatarEmoji !== undefined && { avatarEmoji: body.avatarEmoji }),
      ...(body.avatarUri !== undefined && { avatarUri: body.avatarUri }),
      ...(body.relationshipStartDate !== undefined && {
        relationshipStartDate: body.relationshipStartDate ? new Date(body.relationshipStartDate) : null,
      }),
      ...(body.loveLanguages !== undefined && {
        loveLanguages: JSON.stringify(normalizeLoveLanguages(body.loveLanguages)),
      }),
      ...(body.interests !== undefined && { interests: JSON.stringify(body.interests) }),
      ...(body.timezone !== undefined && { timezone: body.timezone }),
      ...(languageChanged && { language: body.language, languageChangedAt: new Date() }),
      ...(body.birthdate !== undefined && { birthdate: body.birthdate ? new Date(body.birthdate) : null }),
      ...(body.occupation !== undefined && { occupation: body.occupation }),
      ...(body.habits !== undefined && { habits: body.habits }),
      ...(body.city !== undefined && { city: body.city }),
      ...(body.journalReminderEnabled !== undefined && { journalReminderEnabled: body.journalReminderEnabled }),
    },
  });

  res.json(serializeUser(user));
});

usersRouter.patch('/me/notifications', async (req: AuthedRequest, res) => {
  const { pushToken } = req.body as { pushToken?: string | null };

  await db.user.update({
    where: { id: req.userId },
    data: { pushToken: pushToken ?? null },
  });

  res.status(204).send();
});

usersRouter.get('/me/partner', async (req: AuthedRequest, res) => {
  const user = await db.user.findUnique({ where: { id: req.userId } });
  if (!user?.coupleId) {
    res.json(null);
    return;
  }
  const partner = await db.user.findFirst({
    where: { coupleId: user.coupleId, id: { not: user.id } },
  });
  res.json(partner ? serializeUser(partner) : null);
});

// GDPR/CCPA "right to access": everything this app holds that's tied to the
// requesting user. A one-off, on-demand export -- unlike the list endpoints
// elsewhere, including full photoUri here is fine (this is one request per
// user, not a payload refetched on every screen focus).
usersRouter.get('/me/export', async (req: AuthedRequest, res) => {
  const user = await db.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    res.status(404).json({ error: t(langOf(req), 'userNotFound') });
    return;
  }

  const [entries, notifications, reports] = await Promise.all([
    db.entry.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
    user.coupleId
      ? db.weeklyReport.findMany({ where: { coupleId: user.coupleId }, orderBy: { createdAt: 'desc' } })
      : Promise.resolve([]),
  ]);

  res.json({
    exportedAt: new Date().toISOString(),
    profile: serializeUser(user),
    entries: entries.map(serializeEntry),
    notifications: notifications.map(serializeNotification),
    // Reports are couple-level (blended from both partners' entries), but
    // they're derived from this user's own data and shared with them, so
    // they're part of what this account has access to.
    reports: reports.map((r) => ({
      id: r.id,
      weekId: r.weekId,
      weekLabel: r.weekLabel,
      generatedAt: r.createdAt.toISOString(),
      report: JSON.parse(r.reportJson),
    })),
  });
});

usersRouter.delete('/me', async (req: AuthedRequest, res) => {
  const user = await db.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    res.status(404).json({ error: t(langOf(req), 'userNotFound') });
    return;
  }

  // The partner didn't initiate this and has no other way to find out --
  // same courtesy as leaving a couple, since deleting the account dissolves
  // the pairing for them too.
  const partner = user.coupleId
    ? await db.user.findFirst({ where: { coupleId: user.coupleId, id: { not: user.id } } })
    : null;

  await db.$transaction([
    ...(partner
      ? [
          db.user.update({ where: { id: partner.id }, data: { coupleId: null } }),
          db.notification.create({
            data: {
              userId: partner.id,
              type: 'partner_left',
              message: t(normalizeLang(partner.language), 'notifPartnerDeletedAccount', { name: user.name }),
            },
          }),
        ]
      : []),
    db.notification.deleteMany({ where: { userId: user.id } }),
    db.entry.deleteMany({ where: { userId: user.id } }),
    db.user.delete({ where: { id: user.id } }),
  ]);

  res.status(204).send();
});
