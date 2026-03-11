import { supabase } from '@/lib/supabase';

export interface PeriodicGoal {
  id: string;
  user_id: string;
  mes_ref: string;
  meta1: number;
  meta2: number;
  supermeta: number;
  daily_meta1: number;
  daily_meta2: number;
  daily_supermeta: number;
  created_at: string;
  updated_at: string;
}

export interface PeriodicGoalInput {
  user_id: string;
  mes_ref: string;
  meta1: number;
  meta2: number;
  supermeta: number;
  daily_meta1: number;
  daily_meta2: number;
  daily_supermeta: number;
}

const toFirstDayOfMonth = (mes: string): string => {
  if (mes.length === 7) return `${mes}-01`;
  return `${mes.substring(0, 7)}-01`;
};

export const periodicGoalsService = {
  async getMetaPorPeriodo(userId: string, mesRef: string): Promise<PeriodicGoal | null> {
    const { data, error } = await supabase
      .from('periodic_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('mes_ref', toFirstDayOfMonth(mesRef))
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar meta por periodo:', error);
      return null;
    }

    return data;
  },

  async getGoalsBySellerIds(userIds: string[], mesRef: string): Promise<Map<string, PeriodicGoal>> {
    if (userIds.length === 0) return new Map();

    const { data, error } = await supabase
      .from('periodic_goals')
      .select('*')
      .in('user_id', userIds)
      .eq('mes_ref', toFirstDayOfMonth(mesRef));

    if (error) {
      console.error('Erro ao buscar metas periodicas:', error);
      return new Map();
    }

    const map = new Map<string, PeriodicGoal>();
    (data || []).forEach((goal) => map.set(goal.user_id, goal));
    return map;
  },

  async upsertMeta(inputOrUserId: PeriodicGoalInput | string, mesRef?: string, valor?: number): Promise<PeriodicGoal | null> {
    const input: PeriodicGoalInput =
      typeof inputOrUserId === 'string'
        ? {
            user_id: inputOrUserId,
            mes_ref: mesRef || '',
            meta1: valor || 0,
            meta2: 0,
            supermeta: 0,
            daily_meta1: 0,
            daily_meta2: 0,
            daily_supermeta: 0,
          }
        : inputOrUserId;

    const { data, error } = await supabase
      .from('periodic_goals')
      .upsert(
        {
          ...input,
          mes_ref: toFirstDayOfMonth(input.mes_ref),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,mes_ref' }
      )
      .select()
      .single();

    if (error) {
      console.error('Erro ao salvar meta periodica:', error);
      return null;
    }

    return data;
  },
};
