import React from 'react';
import { Text, View } from 'react-native';

import { captureBootstrapError } from '@/lib/bootstrap-diagnostics';

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

function DefaultFallback() {
  return (
    <View className="flex-1 items-center justify-center bg-black px-6">
      <Text className="text-center text-lg font-semibold text-white">Ocorreu um erro inesperado</Text>
      <Text className="mt-2 text-center text-sm text-[#9CA3AF]">Feche e abra o app novamente.</Text>
      <Text className="mt-4 text-xs text-[#6B7280]">Detalhes foram registrados para diagnostico.</Text>
    </View>
  );
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
    captureBootstrapError(error, 'react-error-boundary');
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <DefaultFallback />;
    }

    return this.props.children;
  }
}
