import { supabase } from '@/lib/supabase';

export interface ChecklistItemRow {
  id: string;
  period: string;
  task: string;
  task_type: 'omc' | 'vendedor' | 'specific';
  display_order: number;
  target_role?: string;
}

export interface ChecklistWithProgress extends ChecklistItemRow {
  completed: boolean;
  completed_at: string | null;
  progress_id: string | null;
}

export interface PeriodProgress {
  date: string;
  period: 'morning' | 'midday' | 'afternoon' | 'evening';
  completed: number;
  total: number;
}

export const checklistService = {
  async getChecklistWithProgress(
    userId: string,
    companyId: string,
    date: string,
    userRole?: 'ADMIN' | 'GESTOR' | 'VENDEDOR'
  ): Promise<ChecklistWithProgress[]> {
    const taskType = userRole === 'VENDEDOR' ? 'vendedor' : 'omc';

    const { data: items, error: itemsError } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('task_type', taskType)
      .eq('active', true)
      .order('display_order', { ascending: true });

    if (itemsError) return [];

    const { data: progress, error: progressError } = await supabase
      .from('checklist_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .eq('date', date);

    if (progressError) return [];

    const progressMap = new Map((progress || []).map((p: any) => [p.checklist_item_id, p]));

    return (items || []).map((item: any) => ({
      ...item,
      completed: progressMap.get(item.id)?.completed || false,
      completed_at: progressMap.get(item.id)?.completed_at || null,
      progress_id: progressMap.get(item.id)?.id || null,
    }));
  },

  async toggleChecklistItem(
    checklistItemId: string,
    userId: string,
    companyId: string,
    date: string,
    completed: boolean
  ): Promise<boolean> {
    if (completed) {
      const { error } = await supabase.from('checklist_progress').upsert(
        {
          checklist_item_id: checklistItemId,
          user_id: userId,
          company_id: companyId,
          date,
          completed: true,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'checklist_item_id,user_id,date' }
      );

      return !error;
    }

    const { error } = await supabase
      .from('checklist_progress')
      .delete()
      .eq('checklist_item_id', checklistItemId)
      .eq('user_id', userId)
      .eq('date', date);

    return !error;
  },

  async getPeriodProgress(
    userId: string,
    companyId: string,
    startDate: string,
    endDate: string,
    taskType: 'omc' | 'vendedor' = 'omc'
  ): Promise<PeriodProgress[]> {
    const { data: items, error: itemsError } = await supabase
      .from('checklist_items')
      .select('id, period, task_type')
      .eq('task_type', taskType)
      .eq('active', true);

    if (itemsError) return [];

    const totalsByPeriod: Record<'morning' | 'noon' | 'afternoon' | 'night', number> = {
      morning: 0,
      noon: 0,
      afternoon: 0,
      night: 0,
    };

    (items || []).forEach((item: any) => {
      const period = item.period as 'morning' | 'noon' | 'afternoon' | 'night';
      if (totalsByPeriod[period] !== undefined) totalsByPeriod[period] += 1;
    });

    const { data: progress, error: progressError } = await supabase
      .from('checklist_progress')
      .select('date, checklist_item:checklist_item_id (id, period, task_type)')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('completed', true);

    if (progressError) return [];

    const completedByDatePeriod = new Map<string, number>();

    (progress || []).forEach((row: any) => {
      const item = row.checklist_item;
      if (!item || item.task_type !== taskType) return;
      const period = item.period as 'morning' | 'noon' | 'afternoon' | 'night';
      const key = `${row.date}|${period}`;
      completedByDatePeriod.set(key, (completedByDatePeriod.get(key) || 0) + 1);
    });

    const toDate = (dateStr: string) => new Date(`${dateStr}T00:00:00`);
    const start = toDate(startDate);
    const end = toDate(endDate);
    const dates: string[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${day}`);
    }

    const uiPeriods: Array<'morning' | 'midday' | 'afternoon' | 'evening'> = [
      'morning',
      'midday',
      'afternoon',
      'evening',
    ];

    const uiToDb: Record<'morning' | 'midday' | 'afternoon' | 'evening', 'morning' | 'noon' | 'afternoon' | 'night'> = {
      morning: 'morning',
      midday: 'noon',
      afternoon: 'afternoon',
      evening: 'night',
    };

    const result: PeriodProgress[] = [];
    dates.forEach((date) => {
      uiPeriods.forEach((period) => {
        const dbPeriod = uiToDb[period];
        const total = totalsByPeriod[dbPeriod] || 0;
        const completed = completedByDatePeriod.get(`${date}|${dbPeriod}`) || 0;
        result.push({ date, period, completed, total });
      });
    });

    return result;
  },
};
