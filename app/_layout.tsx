import '@/global.css';

import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastRoot } from '@/components/ui/Toast';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { supabaseConfigError } from '@/lib/supabase';

function Gate() {
  const { loading, isAuthenticated, role, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAdminGroup = segments[0] === '(admin)';
    const isOnboardingRoute = segments.includes('onboarding');
    const mustOnboard = role === 'GESTOR' && !user?.company_id;

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
      return;
    }

    if (isAuthenticated && inAdminGroup && role !== 'ADMIN') {
      if (role === 'GESTOR') router.replace('/(gestor)');
      if (role === 'VENDEDOR') router.replace('/(vendedor)');
      return;
    }

    if (isAuthenticated && mustOnboard && !isOnboardingRoute) {
      router.replace('/(auth)/onboarding/step1');
      return;
    }

    if (isAuthenticated && inAuthGroup && !mustOnboard) {
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

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0A0A0A]">
        <ActivityIndicator color="#FF6B35" size="large" />
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
