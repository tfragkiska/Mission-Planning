import { create } from "zustand";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import type { Notification } from "../lib/types";

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  initSocketListener: () => () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const notifications = await api.notifications.list({ limit: 50 });
      const unreadCount = notifications.filter((n) => !n.read).length;
      set({ notifications, unreadCount, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  markRead: async (id: string) => {
    try {
      await api.notifications.markRead(id);
      set((state) => {
        const updated = state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n,
        );
        return {
          notifications: updated,
          unreadCount: updated.filter((n) => !n.read).length,
        };
      });
    } catch {
      // Silently fail
    }
  },

  markAllRead: async () => {
    try {
      await api.notifications.markAllRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch {
      // Silently fail
    }
  },

  initSocketListener: () => {
    const socket = getSocket();

    const handler = (notification: Notification) => {
      set((state) => ({
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      }));
    };

    socket.on("notification:new", handler);

    // Return cleanup function
    return () => {
      socket.off("notification:new", handler);
    };
  },
}));
