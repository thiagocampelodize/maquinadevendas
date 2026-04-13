import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { router } from "expo-router";

import {
  captureBootstrapError,
  markBootstrapStage,
} from "@/lib/bootstrap-diagnostics";
import { authService } from "@/services/authService";
import type { AuthUser, UserRole } from "@/types";

export interface AuthState {
  user: AuthUser | null;
  profile: null;
  role: UserRole | null;
  company: { id: string } | null;
  isAuthenticated: boolean;
  loading: boolean;
}

interface SignInResult {
  success: boolean;
  error?: string;
  role?: UserRole;
}

interface AuthContextType extends AuthState {
  signIn: (username: string, password: string) => Promise<SignInResult>;
  signInAdmin: (username: string, password: string) => Promise<SignInResult>;
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

function navigateByRole(role: UserRole) {
  if (role === "ADMIN") router.replace("/(admin)");
  else if (role === "GESTOR") router.replace("/(gestor)");
  else if (role === "VENDEDOR") router.replace("/(vendedor)");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

  const loadSession = useCallback(async (options?: { silent?: boolean }) => {
    markBootstrapStage("auth-restore-start", {
      silent: Boolean(options?.silent),
    });

    if (!options?.silent) {
      setState((prev) => ({ ...prev, loading: true }));
    }

    try {
      const user = await authService.restoreSession();

      if (!user) {
        markBootstrapStage("auth-restore-empty");
        if (!options?.silent) {
          setState({ ...initialState, loading: false });
        }
        return;
      }

      markBootstrapStage("auth-restore-success", { role: user.role });
      setState({
        user,
        profile: null,
        role: user.role,
        company: user.company_id ? { id: user.company_id } : null,
        isAuthenticated: true,
        loading: false,
      });
    } catch {
      captureBootstrapError(
        new Error("Failed to restore auth session"),
        "auth-restore-session",
      );
      setState({ ...initialState, loading: false });
    }
  }, []);

  useEffect(() => {
    void loadSession({ silent: true });
  }, [loadSession]);

  const signIn = useCallback(
    async (username: string, password: string): Promise<SignInResult> => {
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

      navigateByRole(user.role);

      return { success: true, role: user.role };
    },
    [],
  );

  const signInAdmin = useCallback(
    async (username: string, password: string): Promise<SignInResult> => {
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

      navigateByRole(user.role);

      return { success: true, role: user.role };
    },
    [],
  );

  const signOut = useCallback(async () => {
    await authService.signOut();
    setState({ ...initialState, loading: false });

    router.replace("/(auth)/login");
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      ...state,
      signIn,
      signInAdmin,
      signOut,
      refreshUser: loadSession,
    }),
    [state, signIn, signInAdmin, signOut, loadSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
