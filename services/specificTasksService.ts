import { supabase } from '@/lib/supabase';

export interface SpecificTask {
  id: string;
  company_id: string;
  period: 'morning' | 'noon' | 'afternoon' | 'night';
  task: string;
  assigned_to: string | null;
  created_by: string;
  completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
  date: string;
  created_at: string;
}

export interface SpecificTaskInput {
  company_id: string;
  period: 'morning' | 'noon' | 'afternoon' | 'night';
  task: string;
  assigned_to?: string | null;
  created_by: string;
  date: string;
}

export const specificTasksService = {
  async getTasksByDate(companyId: string, date: string): Promise<SpecificTask[]> {
    const { data, error } = await supabase
      .from('specific_tasks')
      .select('*')
      .eq('company_id', companyId)
      .eq('date', date)
      .order('created_at', { ascending: true });

    if (error) return [];
    return data || [];
  },

  async createTask(task: SpecificTaskInput): Promise<SpecificTask | null> {
    const { data, error } = await supabase
      .from('specific_tasks')
      .insert({ ...task, completed: false })
      .select()
      .single();

    if (error) return null;
    return data;
  },

  async toggleTask(taskId: string, completed: boolean, completedBy: string): Promise<boolean> {
    const updateData = completed
      ? { completed: true, completed_by: completedBy, completed_at: new Date().toISOString() }
      : { completed: false, completed_by: null, completed_at: null };

    const { error } = await supabase.from('specific_tasks').update(updateData).eq('id', taskId);
    return !error;
  },

  async deleteTask(taskId: string): Promise<boolean> {
    const { error } = await supabase.from('specific_tasks').delete().eq('id', taskId);
    return !error;
  },

  async updateTaskDetails(taskId: string, updates: Partial<SpecificTaskInput>): Promise<boolean> {
    const { error } = await supabase.from('specific_tasks').update(updates).eq('id', taskId);
    return !error;
  },
};
