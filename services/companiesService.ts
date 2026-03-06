import { supabase } from '@/lib/supabase';

export interface Company {
  id: string;
  name: string;
  plan_id: string | null;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
  retroactive_days_limit?: number | null;
  retroactive_months_limit?: number | null;
}

export interface CompanyInput {
  name?: string;
  plan_id?: string | null;
  status?: 'active' | 'inactive' | 'suspended';
  retroactive_days_limit?: number | null;
}

export interface AdminCompanyListItem {
  id: string;
  name: string;
  managerName: string;
  email: string;
  plan: string;
  status: 'Ativo' | 'Inativo' | 'Atraso' | 'Suspensa' | 'Cancelada' | 'Expirada';
  nextBilling: string | null;
  usersCount: number;
  createdAt: string;
}

const asSingle = <T,>(relation: T | T[] | null | undefined): T | null => {
  if (!relation) return null;
  return Array.isArray(relation) ? relation[0] ?? null : relation;
};

const mapStatus = (companyStatus?: string | null, subscriptionStatus?: string | null): AdminCompanyListItem['status'] => {
  const sub = (subscriptionStatus || '').toLowerCase();
  if (sub === 'active') return 'Ativo';
  if (sub === 'overdue' || sub === 'pending') return 'Atraso';
  if (sub === 'cancelled') return 'Cancelada';

  const company = (companyStatus || '').toLowerCase();
  if (company === 'active' || company === 'ativo') return 'Ativo';
  if (company === 'inactive' || company === 'inativo') return 'Inativo';
  if (company === 'suspended' || company === 'suspensa' || company === 'suspenso') return 'Suspensa';
  if (company === 'overdue' || company === 'atraso') return 'Atraso';
  if (company === 'cancelled' || company === 'cancelada') return 'Cancelada';
  if (company === 'expired' || company === 'expirada') return 'Expirada';
  return 'Ativo';
};

const formatUsersLabel = (users: number): string => (users === 1 ? '1 usuario' : `${users} usuarios`);

const statusToCompanyUpdate = (status: AdminCompanyListItem['status']): CompanyInput['status'] => {
  if (status === 'Ativo') return 'active';
  if (status === 'Inativo') return 'inactive';
  return 'suspended';
};

export const companiesService = {
  async getAdminCompanies(): Promise<AdminCompanyListItem[]> {
    const { data: companiesData, error } = await supabase
      .from('companies')
      .select('id, name, status, created_at, plan:plans(name, max_users), users:users(id, full_name, email, role, active)');
    if (error || !companiesData) return [];

    const { data: subscriptionsData } = await supabase
      .from('company_subscriptions')
      .select('company_id, status, users_contracted, next_due_date')
      .eq('sandbox', false);

    const subscriptionsMap = new Map(
      (subscriptionsData || []).filter((item: any) => !!item.company_id).map((item: any) => [item.company_id as string, item]),
    );

    return companiesData.map((company: any) => {
      const users = Array.isArray(company.users) ? company.users : [];
      const manager = users.find((u: any) => String(u.role || '').toLowerCase() === 'gestor' || String(u.role || '').toLowerCase() === 'manager');
      const subscription = subscriptionsMap.get(company.id);
      const contractedUsers = Number(subscription?.users_contracted || 0);
      const maxUsers = Number(asSingle<{ max_users?: number | null }>(company.plan)?.max_users || 0);
      const usersLabel = contractedUsers > 0 ? formatUsersLabel(contractedUsers) : maxUsers > 0 ? formatUsersLabel(maxUsers) : 'Sem configuracao';

      const nextBilling = subscription?.next_due_date
        ? new Date(`${subscription.next_due_date}T00:00:00`).toLocaleDateString('pt-BR')
        : null;

      return {
        id: company.id,
        name: company.name,
        managerName: manager?.full_name || 'Sem gestor',
        email: manager?.email || '-',
        plan: usersLabel,
        status: mapStatus(company.status, subscription?.status),
        nextBilling,
        usersCount: users.length,
        createdAt: company.created_at,
      };
    });
  },

  async getCompanyById(companyId: string): Promise<Company | null> {
    const { data, error } = await supabase.from('companies').select('*').eq('id', companyId).maybeSingle();
    if (error) return null;
    return data;
  },

  async createCompany(company: CompanyInput): Promise<Company | null> {
    const { data, error } = await supabase
      .from('companies')
      .insert({ ...company, status: company.status || 'active' })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Ja existe uma empresa com este nome.');
      }
      return null;
    }

    return data;
  },

  async updateCompany(companyId: string, updates: Partial<CompanyInput>): Promise<Company | null> {
    const { data, error } = await supabase
      .from('companies')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', companyId)
      .select()
      .single();

    if (error) return null;
    return data;
  },

  async checkOnboardingCompleted(companyId: string): Promise<boolean> {
    try {
      const { data: goals } = await supabase.from('goals').select('id').eq('company_id', companyId).limit(1);
      return Boolean(goals && goals.length > 0);
    } catch {
      return false;
    }
  },

  async updateAdminCompany(companyId: string, payload: { name: string; status: AdminCompanyListItem['status'] }): Promise<boolean> {
    const updated = await this.updateCompany(companyId, {
      name: payload.name,
      status: statusToCompanyUpdate(payload.status),
    });
    return !!updated;
  },

  async deleteCompany(companyId: string): Promise<boolean> {
    const { error } = await supabase.from('companies').delete().eq('id', companyId);
    return !error;
  },
};
