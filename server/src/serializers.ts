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
