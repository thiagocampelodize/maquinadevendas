import '@/global.css';
import '@/lib/sentry';

import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BootstrapWatchdog } from '@/components/BootstrapWatchdog';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastRoot } from '@/components/ui/Toast';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { markBootstrapStage } from '@/lib/bootstrap-diagnostics';
import { supabaseConfigError } from '@/lib/supabase';

function Gate() {
  const { loading, isAuthenticated, role, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const replaceWithStage = (
    href: "/(admin)" | "/(gestor)" | "/(vendedor)" | "/(auth)/onboarding/step1",
    context: string
  ) => {
    markBootstrapStage("gate-route-redirect", {
      context,
      role: role ?? "unknown",
      target: href,
    });
    router.replace(href);
  };

  useEffect(() => {
    markBootstrapStage('root-gate-mounted');
  }, []);

  useEffect(() => {
    if (supabaseConfigError) {
      markBootstrapStage('supabase-config-error');
    }
  }, []);

  useEffect(() => {
    if (loading || !isAuthenticated) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAdminGroup = segments[0] === '(admin)';
    const isOnboardingRoute = segments.includes('onboarding');
    const mustOnboard = role === 'GESTOR' && !user?.company_id;
    const isRootRoute = !segments[0];

    markBootstrapStage('authenticated-route-evaluation', {
      role: role ?? 'unknown',
      in_auth_group: inAuthGroup,
      in_admin_group: inAdminGroup,
      onboarding_route: isOnboardingRoute,
      root_route: isRootRoute,
    });

    if (inAdminGroup && role !== 'ADMIN') {
      if (role === 'GESTOR') replaceWithStage('/(gestor)', 'admin-group-protection');
      if (role === 'VENDEDOR') replaceWithStage('/(vendedor)', 'admin-group-protection');
      return;
    }

    if (mustOnboard && !isOnboardingRoute) {
      replaceWithStage('/(auth)/onboarding/step1', 'gestor-onboarding');
      return;
    }

    if ((inAuthGroup || isRootRoute) && !mustOnboard) {
      if (role === 'ADMIN') replaceWithStage('/(admin)', 'authenticated-root-or-auth');
      if (role === 'GESTOR') replaceWithStage('/(gestor)', 'authenticated-root-or-auth');
      if (role === 'VENDEDOR') replaceWithStage('/(vendedor)', 'authenticated-root-or-auth');
    }
  }, [isAuthenticated, loading, role, router, segments, user?.company_id]);

  if (supabaseConfigError) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-center text-xl font-semibold text-white">Configuracao incompleta</Text>
        <Text className="mt-3 text-center text-sm text-text-secondary">
          Este build foi gerado sem as variaveis publicas do Supabase.
        </Text>
        <Text className="mt-2 text-center text-xs text-text-muted">{supabaseConfigError}</Text>
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ToastProvider>
            <ErrorBoundary>
              <BootstrapWatchdog>
                <Gate />
              </BootstrapWatchdog>
              <ToastRoot />
            </ErrorBoundary>
          </ToastProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
