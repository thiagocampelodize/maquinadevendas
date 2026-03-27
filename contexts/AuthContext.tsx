import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { authService } from '@/services/authService';
import type { AuthUser, UserRole } from '@/types';

export interface AuthState {
  user: AuthUser | null;
  profile: null;
  role: UserRole | null;
  company: { id: string } | null;
  isAuthenticated: boolean;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInAdmin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const initialState: AuthState = {
  user: null,
  profile: null,
  role: null,
  company: null,
  isAuthenticated: false,
  loading: false,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

  const loadSession = async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setState((prev) => ({ ...prev, loading: true }));
    }

    try {
      const user = await authService.restoreSession();

      if (!user) {
        if (!options?.silent) {
          setState({ ...initialState, loading: false });
        }
        return;
      }

      setState({
        user,
        profile: null,
        role: user.role,
        company: user.company_id ? { id: user.company_id } : null,
        isAuthenticated: true,
        loading: false,
      });
    } catch {
      setState({ ...initialState, loading: false });
    }
  };

  useEffect(() => {
    void loadSession({ silent: true });
  }, []);

  const signIn = async (username: string, password: string) => {
    const result = await authService.signIn(username, password);
    if (!result.success || !result.user) {
      return { success: false, error: result.error };
    }

    const user = result.user;
    setState({
      user,
      profile: null,
      role: user.role,
      company: user.company_id ? { id: user.company_id } : null,
      isAuthenticated: true,
      loading: false,
    });
    return { success: true };
  };

  const signInAdmin = async (username: string, password: string) => {
    const result = await authService.signInAdmin(username, password);
    if (!result.success || !result.user) {
      return { success: false, error: result.error };
    }

    const user = result.user;
    setState({
      user,
      profile: null,
      role: user.role,
      company: user.company_id ? { id: user.company_id } : null,
      isAuthenticated: true,
      loading: false,
    });
    return { success: true };
  };

  const signOut = async () => {
    await authService.signOut();
    setState({ ...initialState, loading: false });
  };

  const value = useMemo<AuthContextType>(
    () => ({ ...state, signIn, signInAdmin, signOut, refreshUser: loadSession }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
