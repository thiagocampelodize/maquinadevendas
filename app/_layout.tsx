import '@/global.css';
import '@/lib/sentry';

import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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
    const isRootRoute = segments.length === 0;

    markBootstrapStage('authenticated-route-evaluation', {
      role: role ?? 'unknown',
      in_auth_group: inAuthGroup,
      in_admin_group: inAdminGroup,
      onboarding_route: isOnboardingRoute,
      root_route: isRootRoute,
    });

    if (inAdminGroup && role !== 'ADMIN') {
      if (role === 'GESTOR') router.replace('/(gestor)');
      if (role === 'VENDEDOR') router.replace('/(vendedor)');
      return;
    }

    if (mustOnboard && !isOnboardingRoute) {
      router.replace('/(auth)/onboarding/step1');
      return;
    }

    if ((inAuthGroup || isRootRoute) && !mustOnboard) {
      if (role === 'ADMIN') router.replace('/(admin)');
      if (role === 'GESTOR') router.replace('/(gestor)');
      if (role === 'VENDEDOR') router.replace('/(vendedor)');
    }
  }, [isAuthenticated, loading, role, router, segments, user?.company_id]);

  if (supabaseConfigError) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0A0A0A] px-6">
        <Text className="text-center text-xl font-semibold text-white">Configuracao incompleta</Text>
        <Text className="mt-3 text-center text-sm text-[#D1D5DB]">
          Este build foi gerado sem as variaveis publicas do Supabase.
        </Text>
        <Text className="mt-2 text-center text-xs text-[#9CA3AF]">{supabaseConfigError}</Text>
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
              <Gate />
              <ToastRoot />
            </ErrorBoundary>
          </ToastProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
