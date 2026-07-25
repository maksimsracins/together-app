export type EntryType = 'worry' | 'joy' | 'gratitude' | 'wish' | 'thought';

export type EmotionKey =
  | 'joy'
  | 'sadness'
  | 'irritation'
  | 'anxiety'
  | 'love'
  | 'hurt'
  | 'calm'
  | 'doubt'
  | 'gratitude';

export interface Emotion {
  key: EmotionKey;
  emoji: string;
  label: string;
}

export interface EntryTypeMeta {
  key: EntryType;
  emoji: string;
  label: string;
}

export interface Entry {
  id: string;
  authorId: string;
  type: EntryType;
  emotion: EmotionKey;
  text: string;
  tags: string[];
  hasPhoto: boolean;
  hasAudio: boolean;
  weekId?: string;
  includedInReportId: string | null;
  createdAt: string; // ISO
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  avatarEmoji: string;
  avatarUri?: string | null;
  relationshipStartDate: string | null;
  loveLanguages: string[];
  interests: string[];
  timezone: string;
  birthdate?: string | null;
  occupation?: string | null;
  habits?: string | null;
  journalReminderEnabled?: boolean;
  coupleId?: string | null;
}

export interface WeeklyReportEntry {
  id: string;
  type: EntryType;
  emotion: EmotionKey;
  text: string;
  createdAt: string; // ISO
  reactionEmoji: string | null;
}

export interface WeeklyReport {
  weekLabel: string;
  myEntries: WeeklyReportEntry[];
  partnerEntries: WeeklyReportEntry[];
  narrative: string;
  narrativeDeep: string;
}
