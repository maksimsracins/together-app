import { Entry, Notification, User } from '@prisma/client';

export function serializeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarEmoji: user.avatarEmoji,
    avatarUri: user.avatarUri,
    relationshipStartDate: user.relationshipStartDate?.toISOString().slice(0, 10) ?? null,
    loveLanguages: JSON.parse(user.loveLanguages) as string[],
    interests: JSON.parse(user.interests) as string[],
    timezone: user.timezone,
    birthdate: user.birthdate?.toISOString().slice(0, 10) ?? null,
    occupation: user.occupation,
    habits: user.habits,
    city: user.city,
    journalReminderEnabled: user.journalReminderEnabled,
    coupleId: user.coupleId,
  };
}

export function serializeNotification(notification: Notification) {
  return {
    id: notification.id,
    type: notification.type,
    message: notification.message,
    createdAt: notification.createdAt.toISOString(),
    readAt: notification.readAt?.toISOString() ?? null,
  };
}

export function serializeEntry(entry: Entry) {
  return {
    id: entry.id,
    authorId: entry.userId,
    type: entry.type,
    emotion: entry.emotion,
    text: entry.text,
    tags: JSON.parse(entry.tags) as string[],
    hasPhoto: entry.hasPhoto,
    hasAudio: entry.hasAudio,
    photoUri: entry.photoUri,
    weekId: entry.weekId,
    includedInReportId: entry.includedInReportId,
    createdAt: entry.createdAt.toISOString(),
  };
}

// Lists can span a user's entire history (Calendar's "all" fetch), while
// photoUri is a full base64 data URI up to 5MB -- including it per row turns
// a lifetime list into a payload of hundreds of megabytes. Lists only ever
// need `hasPhoto` to show an indicator; the actual photo is fetched once,
// on demand, via GET /api/entries/:id when a specific entry is opened.
export function serializeEntryListItem(entry: Entry) {
  const { photoUri: _photoUri, ...rest } = serializeEntry(entry);
  return rest;
}
