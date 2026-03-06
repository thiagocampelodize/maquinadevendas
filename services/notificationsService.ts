import { supabase } from '@/lib/supabase';

export interface NotificationInput {
  user_id: string;
  type: 'task_assigned' | 'task_reminder' | 'goal_achieved' | 'general' | 'note_inserted';
  title: string;
  message?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'task_assigned' | 'task_reminder' | 'goal_achieved' | 'general' | 'note_inserted';
  title: string;
  message: string | null;
  read: boolean;
  read_at: string | null;
  created_at: string;
}

export const notificationsService = {
  async getUserNotifications(userId: string, onlyUnread: boolean = false): Promise<Notification[]> {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (onlyUnread) {
      query = query.eq('read', false);
    }

    const { data, error } = await query.limit(100);
    if (error) return [];
    return data || [];
  },

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) return 0;
    return count || 0;
  },

  async markAsRead(notificationId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);
    return !error;
  },

  async markAllAsRead(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false);
    return !error;
  },

  async getRecipientIdsInCompany(companyId: string, userIds: string[]): Promise<string[]> {
    const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
    if (!companyId || uniqueUserIds.length === 0) return [];

    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('company_id', companyId)
      .in('id', uniqueUserIds);

    if (error) return [];
    return (data || []).map((row: { id: string }) => row.id);
  },

  async createNotificationForCompany(companyId: string, notification: NotificationInput) {
    const allowedRecipients = await this.getRecipientIdsInCompany(companyId, [notification.user_id]);
    if (!allowedRecipients.includes(notification.user_id)) return null;

    const { data, error } = await supabase
      .from('notifications')
      .insert({ ...notification, read: false })
      .select()
      .single();

    if (error) return null;
    return data;
  },
};
