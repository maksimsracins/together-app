import { api } from './http';
import { AppUser } from '../types';

export function getMe() {
  return api<AppUser>('/api/me');
}

export function getPartner() {
  return api<AppUser | null>('/api/me/partner');
}

export interface ProfilePatch {
  name?: string;
  avatarEmoji?: string;
  avatarUri?: string | null;
  relationshipStartDate?: string | null;
  loveLanguages?: string[];
  interests?: string[];
  timezone?: string;
  birthdate?: string | null;
  occupation?: string | null;
  habits?: string | null;
  city?: string | null;
  journalReminderEnabled?: boolean;
}

export function updateMe(patch: ProfilePatch) {
  return api<AppUser>('/api/me', { method: 'PATCH', body: patch });
}

export function registerPushToken(pushToken: string | null) {
  return api<void>('/api/me/notifications', { method: 'PATCH', body: { pushToken } });
}
