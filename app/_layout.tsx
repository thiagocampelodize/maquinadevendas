import '@/global.css';

import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastRoot } from '@/components/ui/Toast';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';

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
