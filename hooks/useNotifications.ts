import { useCallback, useEffect, useState } from 'react';

import { notificationsService, type Notification } from '@/services/notificationsService';

export function useNotifications(userId?: string | null) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const reload = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    const [notifications, unread] = await Promise.all([
      notificationsService.getUserNotifications(userId),
      notificationsService.getUnreadCount(userId),
    ]);
    setItems(notifications);
    setUnreadCount(unread);
    setLoading(false);
  }, [userId]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      const ok = await notificationsService.markAsRead(notificationId);
      if (ok) {
        setItems((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true, read_at: new Date().toISOString() } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      return ok;
    },
    []
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) return false;
    const ok = await notificationsService.markAllAsRead(userId);
    if (ok) {
      setItems((prev) => prev.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    }
    return ok;
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!userId) return;
    const intervalId = setInterval(() => {
      void reload();
    }, 120000);
    return () => clearInterval(intervalId);
  }, [reload, userId]);

  return {
    loading,
    items,
    unreadCount,
    reload,
    markAsRead,
    markAllAsRead,
  };
}
