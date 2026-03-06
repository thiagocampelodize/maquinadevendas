import { supabase } from '@/lib/supabase';

export interface SitePlanPricingRow {
  id: string;
  plan_code: 'semestral' | 'anual';
  label: string;
  cycle_months: 6 | 12;
  unit_price_monthly: number;
  min_users: number;
  max_users: number;
  active: boolean;
}

export interface AdminSubscriptionRow {
  id: string;
  company_name: string;
  plan_code: string;
  users_contracted: number;
  status: 'active' | 'pending' | 'overdue' | 'cancelled';
  cycle_total: number;
  next_due_date: string | null;
}

export type CheckoutStatus =
  | 'CREATED'
  | 'PENDING'
  | 'PAID'
  | 'ACTIVATION_PENDING'
  | 'ACTIVATED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'FAILED';

export interface CheckoutSessionRow {
  id: string;
  session_code: string;
  customer_name: string;
  customer_email: string;
  plan_code: string;
  users_count: number;
  cycle_total: number;
  status: CheckoutStatus;
  checkout_url: string | null;
  created_at: string;
}

export interface TempAccessRow {
  id: string;
  email: string;
  type: 'GESTOR' | 'VENDEDOR';
  description: string;
  status: 'Ativo' | 'Expirado' | 'Revogado';
  expires_at: string;
  created_at: string;
}

export interface FinancialMetrics {
  totalRevenue: number;
  mrr: number;
  pendingAmount: number;
  activeSubscriptions: number;
  churnRate: number;
  averageTicket: number;
}

export interface GatewayCompanyConfig {
  id: string;
  company_id: string;
  company_name: string;
  provider: string;
  enabled: boolean;
  sandbox: boolean;
  default_billing_type: string | null;
  webhook_secret: string | null;
  updated_at?: string;
}

export interface GatewayInvoiceRow {
  id: string;
  company_name: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  due_date: string;
  gateway_status?: string | null;
  gateway_charge_id?: string | null;
}

const asSingle = <T,>(relation: T | T[] | null | undefined): T | null => {
  if (!relation) return null;
  return Array.isArray(relation) ? relation[0] ?? null : relation;
};

export const adminService = {
  async getCheckoutSessions(filters?: { status?: CheckoutStatus | 'ALL'; dateFrom?: string; dateTo?: string }): Promise<CheckoutSessionRow[]> {
    let query = supabase
      .from('site_checkout_sessions')
      .select('id,session_code,customer_name,customer_email,plan_code,users_count,cycle_total,status,checkout_url,created_at')
      .eq('sandbox', false)
      .order('created_at', { ascending: false })
      .limit(200);

    if (filters?.status && filters.status !== 'ALL') {
      query = query.eq('status', filters.status);
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', `${filters.dateFrom}T00:00:00`);
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', `${filters.dateTo}T23:59:59`);
    }

    const { data, error } = await query;
    if (error) return [];
    return (data || []) as CheckoutSessionRow[];
  },

  async resendActivation(sessionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
      const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

      const response = await fetch(`${baseUrl}/functions/v1/public-site/checkout-sessions/${sessionId}/resend-activation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return { success: false, message: data?.error || 'Falha ao reenviar ativacao.' };
      const ok = Boolean(data?.success);
      return { success: ok, message: data?.message || (ok ? 'Link reenviado.' : 'Falha ao reenviar.') };
    } catch {
      return { success: false, message: 'Falha ao reenviar ativacao.' };
    }
  },

  async getSitePlanPricing(): Promise<SitePlanPricingRow[]> {
    const { data, error } = await supabase.from('site_plan_pricing').select('*').order('cycle_months', { ascending: true });
    if (error) return [];
    return (data || []) as SitePlanPricingRow[];
  },

  async upsertSitePlanPricing(row: Omit<SitePlanPricingRow, 'id'>): Promise<boolean> {
    const { error } = await supabase
      .from('site_plan_pricing')
      .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'plan_code' });
    return !error;
  },

  async getSubscriptions(): Promise<AdminSubscriptionRow[]> {
    const { data, error } = await supabase
      .from('company_subscriptions')
      .select('id, plan_code, users_contracted, status, cycle_total, next_due_date, companies(name)')
      .eq('sandbox', false)
      .order('updated_at', { ascending: false });

    if (error || !data) return [];

    return (data as any[]).map((row) => ({
      id: row.id,
      company_name: asSingle<{ name?: string | null }>(row.companies)?.name || 'Empresa',
      plan_code: row.plan_code || '-',
      users_contracted: Number(row.users_contracted || 0),
      status: row.status || 'pending',
      cycle_total: Number(row.cycle_total || 0),
      next_due_date: row.next_due_date || null,
    }));
  },

  async getTempAccesses(): Promise<TempAccessRow[]> {
    const { data, error } = await supabase.from('temp_access_grants').select('*').order('created_at', { ascending: false });
    if (error || !data) return [];
    return (data as any[]).map((item) => ({
      id: item.id,
      email: item.email,
      type: ((item.type || '').toUpperCase() === 'GESTOR' ? 'GESTOR' : 'VENDEDOR') as 'GESTOR' | 'VENDEDOR',
      description: item.description || '-',
      status: item.status || 'Ativo',
      expires_at: item.expires_at,
      created_at: item.created_at,
    }));
  },

  async createTempAccess(payload: { email: string; type: 'GESTOR' | 'VENDEDOR'; description: string; expiresAt: string }): Promise<boolean> {
    const { error } = await supabase.from('temp_access_grants').insert({
      email: payload.email,
      type: payload.type,
      description: payload.description,
      expires_at: payload.expiresAt,
      status: 'Ativo',
    });
    return !error;
  },

  async revokeTempAccess(id: string): Promise<boolean> {
    const { error } = await supabase.from('temp_access_grants').update({ status: 'Revogado' }).eq('id', id);
    return !error;
  },

  async getFinancialMetrics(): Promise<FinancialMetrics> {
    const [{ data: invoices }, { data: subscriptions }, { count: totalCompanies }, { count: cancelledCompanies }] = await Promise.all([
      supabase.from('invoices').select('amount,status').eq('sandbox', false),
      supabase.from('company_subscriptions').select('users_contracted,unit_price_monthly,status').eq('sandbox', false),
      supabase.from('companies').select('id', { count: 'exact', head: true }),
      supabase.from('companies').select('id', { count: 'exact', head: true }).in('status', ['inactive', 'suspended', 'cancelled']),
    ]);

    const paidInvoices = (invoices || []).filter((inv: any) => inv.status === 'paid');
    const pendingInvoices = (invoices || []).filter((inv: any) => inv.status === 'pending' || inv.status === 'overdue');
    const totalRevenue = paidInvoices.reduce((sum: number, inv: any) => sum + Number(inv.amount || 0), 0);
    const pendingAmount = pendingInvoices.reduce((sum: number, inv: any) => sum + Number(inv.amount || 0), 0);

    const activeSubs = (subscriptions || []).filter((sub: any) => sub.status === 'active');
    const mrr = activeSubs.reduce(
      (sum: number, sub: any) => sum + Number(sub.users_contracted || 0) * Number(sub.unit_price_monthly || 0),
      0,
    );

    const activeSubscriptions = activeSubs.length;
    const averageTicket = paidInvoices.length > 0 ? totalRevenue / paidInvoices.length : 0;
    const churnRate = totalCompanies && totalCompanies > 0 ? ((cancelledCompanies || 0) / totalCompanies) * 100 : 0;

    return {
      totalRevenue,
      mrr,
      pendingAmount,
      activeSubscriptions,
      churnRate,
      averageTicket,
    };
  },

  async getConsolidatedHealth(): Promise<Array<{ module: string; health: number; incidents: number }>> {
    const [{ count: totalCompanies }, { count: activeCompanies }, { count: pendingInvoices }, { count: overdueInvoices }, { count: checklistDone }, { count: salesCount }] =
      await Promise.all([
        supabase.from('companies').select('id', { count: 'exact', head: true }),
        supabase.from('companies').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('sandbox', false).eq('status', 'pending'),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('sandbox', false).eq('status', 'overdue'),
        supabase.from('checklist_progress').select('id', { count: 'exact', head: true }).eq('completed', true),
        supabase.from('sales').select('id', { count: 'exact', head: true }),
      ]);

    const dashboardHealth = totalCompanies && totalCompanies > 0 ? Math.min(100, Math.round(((activeCompanies || 0) / totalCompanies) * 100)) : 90;
    const vendasIncidents = (pendingInvoices || 0) + (overdueInvoices || 0);
    const vendasHealth = Math.max(70, 100 - vendasIncidents * 3);
    const rotinaHealth = checklistDone && checklistDone > 0 ? 96 : 88;
    const diarioHealth = salesCount && salesCount > 0 ? 97 : 90;

    return [
      { module: 'Dashboard', health: dashboardHealth, incidents: Math.max(0, (totalCompanies || 0) - (activeCompanies || 0)) },
      { module: 'Vendas', health: vendasHealth, incidents: vendasIncidents },
      { module: 'Rotina', health: rotinaHealth, incidents: rotinaHealth >= 95 ? 1 : 3 },
      { module: 'Diario', health: diarioHealth, incidents: diarioHealth >= 95 ? 0 : 2 },
    ];
  },

  async getReportsSummary(): Promise<Array<{ id: string; title: string; generatedAt: string; format: string }>> {
    const [{ count: activeCompanies }, { count: inactiveUsers }, { data: subscriptions }] = await Promise.all([
      supabase.from('companies').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('active', false),
      supabase.from('company_subscriptions').select('users_contracted,unit_price_monthly,status').eq('sandbox', false),
    ]);

    const mrr = (subscriptions || [])
      .filter((item: any) => item.status === 'active')
      .reduce((sum: number, item: any) => sum + Number(item.users_contracted || 0) * Number(item.unit_price_monthly || 0), 0);

    const now = new Date();
    return [
      { id: 'rep-01', title: `Empresas ativas no periodo: ${activeCompanies || 0}`, generatedAt: now.toLocaleString('pt-BR'), format: 'PDF' },
      { id: 'rep-02', title: `Usuarios inativos detectados: ${inactiveUsers || 0}`, generatedAt: now.toLocaleString('pt-BR'), format: 'XLSX' },
      { id: 'rep-03', title: `MRR estimado atual: ${mrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, generatedAt: now.toLocaleString('pt-BR'), format: 'CSV' },
    ];
  },

  async getGatewayOverview(): Promise<{ configs: GatewayCompanyConfig[]; invoices: GatewayInvoiceRow[] }> {
    const [{ data: companies }, { data: configs }, { data: invoices }] = await Promise.all([
      supabase.from('companies').select('id,name'),
      supabase.from('gateway_configs').select('*').eq('provider', 'asaas'),
      supabase
        .from('invoices')
        .select('id, amount, status, due_date, gateway_status, gateway_charge_id, companies(name)')
        .eq('sandbox', false)
        .order('due_date', { ascending: false })
        .limit(20),
    ]);

    const companyNameById = new Map((companies || []).map((company: any) => [company.id, company.name]));

    const mappedConfigs: GatewayCompanyConfig[] = (configs || []).map((config: any) => ({
      id: config.id,
      company_id: config.company_id,
      company_name: companyNameById.get(config.company_id) || 'Empresa',
      provider: config.provider,
      enabled: !!config.enabled,
      sandbox: !!config.sandbox,
      default_billing_type: config.default_billing_type || null,
      webhook_secret: config.webhook_secret || null,
      updated_at: config.updated_at,
    }));

    const mappedInvoices: GatewayInvoiceRow[] = (invoices || []).map((invoice: any) => ({
      id: invoice.id,
      company_name: asSingle<{ name?: string | null }>(invoice.companies)?.name || 'Empresa',
      amount: Number(invoice.amount || 0),
      status: invoice.status,
      due_date: invoice.due_date,
      gateway_status: invoice.gateway_status || null,
      gateway_charge_id: invoice.gateway_charge_id || null,
    }));

    return { configs: mappedConfigs, invoices: mappedInvoices };
  },

  async createInvoice(payload: {
    company_id: string;
    amount: number;
    due_date: string;
    status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  }): Promise<{ success: boolean; invoiceId?: string }> {
    const { data: company } = await supabase.from('companies').select('plan_id').eq('id', payload.company_id).maybeSingle();

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        company_id: payload.company_id,
        plan_id: company?.plan_id || null,
        amount: payload.amount,
        status: payload.status,
        issued_date: new Date().toISOString().substring(0, 10),
        due_date: payload.due_date,
      })
      .select('id')
      .single();

    if (error || !data?.id) return { success: false };
    return { success: true, invoiceId: data.id as string };
  },

  async syncInvoice(invoiceId: string, action: 'create' | 'update' | 'cancel'): Promise<boolean> {
    const { data, error } = await supabase.functions.invoke('asaas-sync-invoice', {
      body: { invoiceId, action },
    });
    if (error) return false;
    return !!data?.success;
  },

  async reconcile(limit: number = 200): Promise<boolean> {
    const { data, error } = await supabase.functions.invoke('asaas-reconcile', {
      body: { limit },
    });
    if (error) return false;
    return !!data?.success;
  },

  async upsertGatewayConfig(payload: {
    company_id: string;
    enabled: boolean;
    sandbox: boolean;
    default_billing_type: string;
    webhook_secret: string;
  }): Promise<boolean> {
    const { error } = await supabase.from('gateway_configs').upsert(
      {
        company_id: payload.company_id,
        provider: 'asaas',
        enabled: payload.enabled,
        sandbox: payload.sandbox,
        default_billing_type: payload.default_billing_type,
        webhook_secret: payload.webhook_secret || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'company_id,provider' },
    );

    return !error;
  },
};
