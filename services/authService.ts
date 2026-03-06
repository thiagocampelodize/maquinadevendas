import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';
import type { AuthUser } from '@/types';
import { normalizeRole } from '@/utils/roleUtils';

export const SESSION_KEY = '@maquina_vendas:session';

interface SignInResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

interface SignInOptions {
  adminOnly?: boolean;
}

const isCompanySuspended = (row: any): boolean => {
  if (!row?.company_id) return false;
  if (normalizeRole(row?.role) === 'ADMIN') return false;
  const companyStatus = String(row?.companies?.status || '').toLowerCase();
  return companyStatus === 'suspended';
};

const mapUser = (row: any): AuthUser => ({
  id: row.id,
  username: row.username,
  name: row.full_name,
  email: row.email,
  role: normalizeRole(row.role),
  company_id: row.company_id,
  active: row.active,
});

export const authService = {
  async restoreSession(): Promise<AuthUser | null> {
    const session = await AsyncStorage.getItem(SESSION_KEY);
    if (!session) return null;

    try {
      const parsed = JSON.parse(session) as AuthUser;

      const { data, error } = await supabase
        .from('users')
        .select('id, username, full_name, email, role, company_id, active, companies(status)')
        .eq('id', parsed.id)
        .eq('active', true)
        .single();

      if (error || !data || isCompanySuspended(data)) {
        await AsyncStorage.removeItem(SESSION_KEY);
        return null;
      }

      const user = mapUser(data);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
      return user;
    } catch {
      await AsyncStorage.removeItem(SESSION_KEY);
      return null;
    }
  },

  async signIn(usernameOrEmail: string, password: string, options?: SignInOptions): Promise<SignInResult> {
    try {
      const input = usernameOrEmail.toLowerCase().trim();
      const selectFields =
        'id, username, full_name, email, password_hash, role, company_id, active, companies(status)';

      const fetchUserByField = async (field: 'email' | 'username') => {
        const { data, error } = await supabase.from('users').select(selectFields).eq(field, input).limit(2);

        if (error) return { error: 'query' as const };
        if (!data || data.length === 0) return { user: null };
        if (data.length > 1) return { error: 'duplicate' as const };
        return { user: data[0] };
      };

      let userRow: any | null = null;

      if (input.includes('@')) {
        const result = await fetchUserByField('email');
        if (result.error === 'query') return { success: false, error: 'Erro ao conectar. Tente novamente.' };
        if (result.error === 'duplicate') {
          return {
            success: false,
            error: 'Existe mais de um usuário com este e-mail/nome de usuário. Contate o suporte.',
          };
        }
        userRow = result.user ?? null;
      }

      if (!userRow) {
        const result = await fetchUserByField('username');
        if (result.error === 'query') return { success: false, error: 'Erro ao conectar. Tente novamente.' };
        if (result.error === 'duplicate') {
          return {
            success: false,
            error: 'Existe mais de um usuário com este e-mail/nome de usuário. Contate o suporte.',
          };
        }
        userRow = result.user ?? null;
      }

      if (!userRow) return { success: false, error: 'Usuário não encontrado' };

      if (options?.adminOnly && normalizeRole(userRow.role) !== 'ADMIN') {
        return { success: false, error: 'Acesso negado. Apenas administradores podem acessar.' };
      }

      if (!userRow.active) {
        return { success: false, error: 'Usuário desativado. Entre em contato com o administrador.' };
      }
      if (isCompanySuspended(userRow)) {
        return {
          success: false,
          error: 'Acesso suspenso por inadimplência. Regularize o pagamento para liberar o acesso.',
        };
      }

      const inputPassword = String(password ?? '');
      const trimmedPassword = inputPassword.trim();
      const storedPassword = String(userRow.password_hash ?? '');
      if (storedPassword !== inputPassword && storedPassword !== trimmedPassword) {
        return { success: false, error: 'Senha incorreta' };
      }

      const user = mapUser(userRow);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));

      await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', userRow.id);

      return { success: true, user };
    } catch {
      return { success: false, error: 'Erro ao conectar. Tente novamente.' };
    }
  },

  async signInAdmin(usernameOrEmail: string, password: string): Promise<SignInResult> {
    return this.signIn(usernameOrEmail, password, { adminOnly: true });
  },

  async signOut(): Promise<void> {
    await AsyncStorage.removeItem(SESSION_KEY);
  },
};
