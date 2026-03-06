import { supabase } from '@/lib/supabase';
import { getBrazilMonthString } from '@/utils/dateUtils';

export interface Goal {
  id: string;
  company_id: string;
  meta1: number;
  meta2: number;
  supermeta: number;
  realizado_anterior: number;
  month: string;
  created_at: string;
  updated_at: string;
}

export interface GoalInput {
  company_id: string;
  meta1: number;
  meta2: number;
  supermeta: number;
  realizado_anterior?: number;
  month: string;
}

export const goalsService = {
  async getGoalByMonth(companyId: string, monthYYYYMM: string): Promise<Goal | null> {
    const firstDayOfMonth = `${monthYYYYMM}-01`;

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('company_id', companyId)
      .eq('month', firstDayOfMonth)
      .maybeSingle();

    if (error) return null;
    return data;
  },

  async getCurrentGoal(companyId: string): Promise<Goal | null> {
    const currentMonth = getBrazilMonthString();
    const firstDayOfMonth = `${currentMonth}-01`;

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('company_id', companyId)
      .eq('month', firstDayOfMonth)
      .maybeSingle();

    if (error) return null;
    return data;
  },

  async upsertGoal(goal: GoalInput) {
    const { data, error } = await supabase
      .from('goals')
      .upsert(
        {
          ...goal,
          month: goal.month.length === 7 ? `${goal.month}-01` : goal.month,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id,month' }
      )
      .select()
      .single();

    if (error) return null;
    return data;
  },
};
