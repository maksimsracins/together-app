import { create } from 'zustand';
import * as notificationsService from '../services/notifications';
import { AppNotification } from '../services/notifications';

interface NotificationsState {
  items: AppNotification[];
  unreadCount: number;
  load: () => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  reset: () => void;
}

function countUnread(items: AppNotification[]) {
  return items.filter((n) => !n.readAt).length;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  items: [],
  unreadCount: 0,

  load: async () => {
    const items = await notificationsService.listNotifications();
    set({ items, unreadCount: countUnread(items) });
  },

  markAllRead: async () => {
    if (get().unreadCount === 0) return;
    await notificationsService.markAllNotificationsRead();
    const now = new Date().toISOString();
    set((state) => ({
      items: state.items.map((n) => (n.readAt ? n : { ...n, readAt: now })),
      unreadCount: 0,
    }));
  },

  remove: async (id) => {
    await notificationsService.deleteNotification(id);
    set((state) => {
      const items = state.items.filter((n) => n.id !== id);
      return { items, unreadCount: countUnread(items) };
    });
  },

  reset: () => set({ items: [], unreadCount: 0 }),
}));
