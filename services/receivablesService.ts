import { supabase } from '@/lib/supabase';

export interface Receivable {
  id: string;
  company_id: string;
  sale_id?: string | null;
  contract_ref?: string | null;
  customer_name: string;
  customer_document?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  description?: string | null;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  invoice_id?: string | null;
  gateway_customer_id?: string | null;
  gateway_charge_id?: string | null;
  gateway_status?: string | null;
  gateway_payment_link?: string | null;
  gateway_synced_at?: string | null;
  gateway_raw?: Record<string, unknown> | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReceivableInput {
  company_id: string;
  sale_id?: string;
  contract_ref?: string;
  customer_name: string;
  customer_document?: string;
  customer_email?: string;
  customer_phone?: string;
  description?: string;
  amount: number;
  due_date: string;
  status?: 'pending' | 'paid' | 'overdue' | 'cancelled';
  created_by?: string;
}

export type ReceivableSyncAction = 'create' | 'update' | 'cancel';

export const receivablesService = {
  async listReceivables(filters?: {
    status?: Receivable['status'];
    companyId?: string;
  }): Promise<Receivable[]> {
    let query = supabase
      .from('receivables')
      .select('*')
      .order('due_date', { ascending: true });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.companyId) {
      query = query.eq('company_id', filters.companyId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Erro ao listar recebíveis:', error);
      return [];
    }
    return data || [];
  },

  async createReceivable(payload: ReceivableInput): Promise<Receivable | null> {
    const { data, error } = await supabase
      .from('receivables')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao criar recebível:', error);
      return null;
    }
    return data;
  },

  async syncReceivable(
    receivableId: string,
    action: ReceivableSyncAction = 'create',
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('asaas-sync-receivable', {
        body: { receivableId, action },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: !!(data as { success?: boolean })?.success, data };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao sincronizar recebível com Asaas';
      return { success: false, error: message };
    }
  },
};
