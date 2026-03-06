import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types';
import { normalizeRole } from '@/utils/roleUtils';

export interface UserInput {
  username?: string;
  email: string;
  password_hash?: string;
  full_name: string;
  role: UserRole;
  company_id?: string | null;
  phone?: string | null;
  individual_goal?: number | null;
  goal_2?: number;
  super_goal?: number;
  daily_goal?: number;
  daily_goal_custom?: boolean;
  avatar?: string;
  working_days?: string[];
  is_active?: boolean;
  active?: boolean;
}

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  company: string;
  companyId: string | null;
  role: UserRole;
  status: 'Ativo' | 'Inativo';
}

export const usersService = {
  async getAdminUsers(): Promise<AdminUserListItem[]> {
    const { data, error } = await supabase
      .from('users')
      .select('id, company_id, full_name, email, role, active, companies:company_id(name)')
      .order('full_name', { ascending: true });

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      name: row.full_name || 'Usuario sem nome',
      email: row.email || '-',
      company: row.companies?.name || 'Sem empresa',
      companyId: row.company_id || null,
      role: normalizeRole(row.role),
      status: row.active ? 'Ativo' : 'Inativo',
    }));
  },

  async getUserById(userId: string) {
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
    if (error) return null;
    return data;
  },

  async getSellersByCompany(companyId: string, options?: { includeInactive?: boolean }) {
    const includeInactive = options?.includeInactive === true;
    const sellerRoles = ['VENDEDOR', 'vendedor', 'OPERATOR', 'operator'];

    let query = supabase.from('users').select('*').eq('company_id', companyId).in('role', sellerRoles);
    if (!includeInactive) query = query.eq('active', true);

    const { data, error } = await query.order('full_name', { ascending: true });
    if (error) return [];

    return data || [];
  },

  async createUser(user: UserInput) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        ...user,
        role: normalizeRole(user.role),
        active: true,
        is_active: undefined,
      })
      .select()
      .single();

    if (error) return null;
    return data;
  },

  async updateUser(userId: string, updates: Partial<UserInput>) {
    const normalizedUpdates: Partial<UserInput> = {
      ...updates,
      role: updates.role ? normalizeRole(updates.role) : updates.role,
    };

    const { data, error } = await supabase
      .from('users')
      .update({ ...normalizedUpdates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) return null;
    return data;
  },

  async deleteUser(userId: string): Promise<boolean> {
    const { error } = await supabase.from('users').delete().eq('id', userId);
    return !error;
  },
};
