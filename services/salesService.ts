import { supabase } from '@/lib/supabase';
import { getBrazilDate, getBrazilDateString, getRetroactiveStartDate, getStartOfMonthBrazil, isDateInRange } from '@/utils/dateUtils';
import { settingsService } from './settingsService';

const DEFAULT_RETROACTIVE_DAYS_LIMIT = 30;

export interface Sale {
  id: string;
  company_id: string;
  seller_id: string;
  created_by?: string | null;
  period: 'morning' | 'noon' | 'afternoon' | 'night';
  value: number;
  client: string | null;
  product: string | null;
  notes: string | null;
  sale_date: string;
  created_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  seller?: {
    id: string;
    full_name: string;
  };
}

export interface SaleInput {
  company_id: string;
  seller_id: string;
  created_by?: string;
  period: 'morning' | 'noon' | 'afternoon' | 'night';
  value: number;
  client?: string;
  product?: string;
  notes?: string;
  sale_date: string;
}

export interface SalesSummary {
  total: number;
  count: number;
  average: number;
  byPeriod: {
    morning: number;
    noon: number;
    afternoon: number;
    night: number;
  };
  bySeller: Array<{
    seller_id: string;
    seller_name: string;
    total: number;
    count: number;
  }>;
}

export const salesService = {
  async validateSaleDateConstraint(companyId: string, saleDate: string): Promise<{ valid: boolean; message?: string }> {
    try {
      const daysLimit = await settingsService.getRetroactiveDaysLimit(companyId);
      const minAllowedDate = getRetroactiveStartDate(daysLimit);
      const maxAllowedDate = getBrazilDateString();

      if (!isDateInRange(saleDate, minAllowedDate, maxAllowedDate)) {
        return {
          valid: false,
          message: `Data fora do limite permitido (${daysLimit} ${daysLimit === 1 ? 'dia' : 'dias'}).`,
        };
      }
      return { valid: true };
    } catch {
      const fallbackMin = getRetroactiveStartDate(DEFAULT_RETROACTIVE_DAYS_LIMIT);
      const fallbackMax = getBrazilDateString();
      if (!isDateInRange(saleDate, fallbackMin, fallbackMax)) {
        return { valid: false, message: 'Data fora do limite de retroatividade permitido.' };
      }
      return { valid: true };
    }
  },

  async getSalesByDate(companyId: string, date: string): Promise<Sale[]> {
    const { data, error } = await supabase
      .from('sales')
      .select('*, seller:users!sales_seller_id_fkey(id, full_name)')
      .eq('company_id', companyId)
      .eq('sale_date', date)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
  },

  async getSalesByDateRange(companyId: string, startDate: string, endDate: string): Promise<Sale[]> {
    const { data, error } = await supabase
      .from('sales')
      .select('*, seller:users!sales_seller_id_fkey(id, full_name)')
      .eq('company_id', companyId)
      .gte('sale_date', startDate)
      .lte('sale_date', endDate)
      .is('deleted_at', null)
      .order('sale_date', { ascending: false });

    if (error) return [];
    return data || [];
  },

  async getSalesBySellerMonth(sellerId: string, month: string): Promise<number> {
    const startDate = `${month}-01`;
    const [y, m] = month.split('-').map(Number);
    const days = new Date(y, m, 0).getDate();
    const endDate = `${month}-${String(days).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('sales')
      .select('value')
      .eq('seller_id', sellerId)
      .gte('sale_date', startDate)
      .lte('sale_date', endDate)
      .is('deleted_at', null);

    if (error || !data) return 0;
    return data.reduce((sum, row) => sum + Number(row.value || 0), 0);
  },

  async getMonthSales(companyId: string, month?: string): Promise<Sale[]> {
    let startDate: string;
    let endDate: string;

    if (month) {
      startDate = `${month}-01`;
      const [y, m] = month.split('-').map(Number);
      const days = new Date(y, m, 0).getDate();
      endDate = `${month}-${days}`;
    } else {
      const _start = getStartOfMonthBrazil();
      const today = getBrazilDate();
      const y = today.getFullYear();
      const m = today.getMonth() + 1;
      const days = new Date(y, m, 0).getDate();
      startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      endDate = `${y}-${String(m).padStart(2, '0')}-${days}`;
    }

    const { data, error } = await supabase
      .from('sales')
      .select('*, seller:users!sales_seller_id_fkey(id, full_name)')
      .eq('company_id', companyId)
      .gte('sale_date', startDate)
      .lte('sale_date', endDate)
      .is('deleted_at', null)
      .order('sale_date', { ascending: false });

    if (error) return [];
    return data || [];
  },

  async createSale(sale: SaleInput): Promise<Sale | null> {
    const dateValidation = await this.validateSaleDateConstraint(sale.company_id, sale.sale_date);
    if (!dateValidation.valid) {
      throw new Error(dateValidation.message || 'Data inválida para lançamento da venda.');
    }

    const { data, error } = await supabase
      .from('sales')
      .insert(sale)
      .select('*, seller:users!sales_seller_id_fkey(id, full_name)')
      .single();

    if (error) return null;
    return data;
  },

  async updateSaleWithAudit(saleId: string, updates: Partial<SaleInput>, userId: string): Promise<Sale | null> {
    const { data: oldSale, error: fetchError } = await supabase
      .from('sales')
      .select('*')
      .eq('id', saleId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !oldSale) return null;

    if (updates.sale_date) {
      const dateValidation = await this.validateSaleDateConstraint(oldSale.company_id, updates.sale_date);
      if (!dateValidation.valid) {
        throw new Error(dateValidation.message || 'Data inválida para lançamento da venda.');
      }
    }

    const { data: updatedSale, error: updateError } = await supabase
      .from('sales')
      .update(updates)
      .eq('id', saleId)
      .is('deleted_at', null)
      .select('*, seller:users!sales_seller_id_fkey(id, full_name)')
      .single();

    if (updateError || !updatedSale) return null;

    await supabase.from('audit_logs').insert({
      table_name: 'sales',
      record_id: saleId,
      action: 'UPDATE',
      old_values: oldSale,
      new_values: updatedSale,
      changed_by: userId,
    });

    return updatedSale;
  },

  async deleteSale(saleId: string, deletedBy: string): Promise<boolean> {
    const { error } = await supabase
      .from('sales')
      .update({ deleted_at: new Date().toISOString(), deleted_by: deletedBy })
      .eq('id', saleId)
      .is('deleted_at', null);
    return !error;
  },

  async getMonthSummary(companyId: string, month?: string): Promise<SalesSummary> {
    const sales = await this.getMonthSales(companyId, month);
    const summary: SalesSummary = {
      total: 0,
      count: sales.length,
      average: 0,
      byPeriod: { morning: 0, noon: 0, afternoon: 0, night: 0 },
      bySeller: [],
    };

    const sellerMap = new Map<string, { name: string; total: number; count: number }>();
    sales.forEach((sale) => {
      summary.total += sale.value;
      summary.byPeriod[sale.period] += sale.value;
      const sellerData = sellerMap.get(sale.seller_id) || {
        name: sale.seller?.full_name || 'Desconhecido',
        total: 0,
        count: 0,
      };
      sellerData.total += sale.value;
      sellerData.count += 1;
      sellerMap.set(sale.seller_id, sellerData);
    });

    summary.average = sales.length > 0 ? summary.total / sales.length : 0;
    summary.bySeller = Array.from(sellerMap.entries()).map(([seller_id, data]) => ({
      seller_id,
      seller_name: data.name,
      total: data.total,
      count: data.count,
    }));

    return summary;
  },
};
