import { supabase } from '@/lib/supabase';

export interface SellerDailyObservation {
  id: string;
  company_id: string;
  seller_id: string;
  reference_date: string;
  content: string;
  observation_type?: 'OBSERVACAO' | 'FEEDBACK';
  created_by: string;
  created_at: string;
  creator?: {
    id: string;
    full_name: string;
  };
  seller?: {
    id: string;
    full_name: string;
  };
}

export interface SellerDailyObservationInput {
  company_id: string;
  seller_id: string;
  reference_date: string;
  content: string;
  observation_type?: 'OBSERVACAO' | 'FEEDBACK';
  created_by: string;
}

const BASE_SELECT = `
  *,
  creator:users!seller_daily_observations_created_by_fkey(id, full_name),
  seller:users!seller_daily_observations_seller_id_fkey(id, full_name)
`;

export const sellerDailyObservationsService = {
  async getBySellerAndDate(companyId: string, sellerId: string, referenceDate: string): Promise<SellerDailyObservation[]> {
    const { data, error } = await supabase
      .from('seller_daily_observations')
      .select(BASE_SELECT)
      .eq('company_id', companyId)
      .eq('seller_id', sellerId)
      .eq('reference_date', referenceDate)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar observacoes do vendedor/dia:', error);
      return [];
    }

    return data || [];
  },

  async getByCompanyAndPeriod(companyId: string, startDate: string, endDate: string): Promise<SellerDailyObservation[]> {
    const { data, error } = await supabase
      .from('seller_daily_observations')
      .select(BASE_SELECT)
      .eq('company_id', companyId)
      .gte('reference_date', startDate)
      .lte('reference_date', endDate)
      .order('reference_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar observacoes da empresa por periodo:', error);
      return [];
    }

    return data || [];
  },

  async createObservation(payload: SellerDailyObservationInput): Promise<SellerDailyObservation | null> {
    const { data, error } = await supabase
      .from('seller_daily_observations')
      .insert(payload)
      .select(BASE_SELECT)
      .single();

    if (error) {
      console.error('Erro ao criar observacao:', error);
      return null;
    }

    return data;
  },
};
