import { useCallback, useEffect, useState } from 'react';

import { captureBootstrapError, markBootstrapStage } from '@/lib/bootstrap-diagnostics';
import { notificationsService, type Notification } from '@/services/notificationsService';

export function useNotifications(userId?: string | null) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const reload = useCallback(async (reason: 'mount' | 'manual' | 'interval' = 'manual') => {
    if (!userId) {
      setItems([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    markBootstrapStage('notifications-load-start', { reason });
    try {
      const [notifications, unread] = await Promise.all([
        notificationsService.getUserNotifications(userId),
        notificationsService.getUnreadCount(userId),
      ]);
      setItems(notifications);
      setUnreadCount(unread);
      markBootstrapStage('notifications-load-success', {
        reason,
        unread_count: unread,
        notifications_count: notifications.length,
      });
    } catch (error) {
      markBootstrapStage('notifications-load-error', { reason });
      captureBootstrapError(error, 'notifications-load');
      setItems([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
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
    void reload('mount');
  }, [reload]);

  useEffect(() => {
    if (!userId) return;
    const intervalId = setInterval(() => {
      void reload('interval');
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
