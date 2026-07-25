import { api } from './http';

export interface AppNotification {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  readAt: string | null;
}

export function listNotifications() {
  return api<AppNotification[]>('/api/notifications');
}

export function markAllNotificationsRead() {
  return api<void>('/api/notifications/read-all', { method: 'POST' });
}

export function deleteNotification(id: string) {
  return api<void>(`/api/notifications/${id}`, { method: 'DELETE' });
}
