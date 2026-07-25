import { api } from './http';

interface CoupleResponse {
  id: string;
  inviteCode: string;
}

export function createCouple() {
  return api<CoupleResponse>('/api/couples', { method: 'POST' });
}

export function joinCouple(code: string) {
  return api<CoupleResponse>('/api/couples/join', { method: 'POST', body: { code } });
}

export function leaveCouple() {
  return api<void>('/api/couples/leave', { method: 'POST' });
}

export interface CoupleSettings {
  reportWeekday: number;
  reportHour: number;
  reportTimezone: string;
  notificationsEnabled: boolean;
  partnerActivityNotificationsEnabled: boolean;
  coupleCreatedAt: string | null;
  lastReportAt: string | null;
}

export function getCoupleSettings() {
  return api<CoupleSettings>('/api/couples/settings');
}

export function updateCoupleSettings(patch: {
  reportWeekday?: number;
  reportHour?: number;
  reportTimezone?: string;
  notificationsEnabled?: boolean;
  partnerActivityNotificationsEnabled?: boolean;
}) {
  return api<
    Pick<
      CoupleSettings,
      'reportWeekday' | 'reportHour' | 'reportTimezone' | 'notificationsEnabled' | 'partnerActivityNotificationsEnabled'
    >
  >('/api/couples/settings', { method: 'PATCH', body: patch });
}
