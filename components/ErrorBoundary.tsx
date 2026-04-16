import * as Clipboard from 'expo-clipboard';
import { AlertTriangle, Copy, RefreshCw } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { captureBootstrapError } from '@/lib/bootstrap-diagnostics';
import { Sentry, isSentryEnabled } from '@/lib/sentry';
import { buildErrorReport } from '@/utils/errorReport';

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
  eventId: string | null;
  copied: boolean;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    eventId: null,
    copied: false,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
    captureBootstrapError(error, 'react-error-boundary');

    if (isSentryEnabled) {
      try {
        const id = (Sentry as unknown as { lastEventId?: () => string | undefined }).lastEventId?.();
        if (id) {
          this.setState({ eventId: id });
        }
      } catch {
        // ignore
      }
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null, eventId: null, copied: false });
  };

  copy = async () => {
    const { error, eventId } = this.state;
    const report = buildErrorReport(error, {
      stage: 'react-error-boundary',
      eventId,
    });
    try {
      await Clipboard.setStringAsync(report);
      this.setState({ copied: true });
      setTimeout(() => {
        if (this.state.copied) this.setState({ copied: false });
      }, 2500);
    } catch {
      // ignore
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const { error, eventId, copied } = this.state;
      const message = error?.message || 'Erro desconhecido';
      const stack = error?.stack;

      return (
        <SafeAreaView
          className="flex-1 bg-background"
          style={{ backgroundColor: '#0A0A0A' }}
          edges={['left', 'right', 'top', 'bottom']}
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 24, paddingBottom: 32, gap: 16 }}
          >
            <View className="items-center gap-3">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-[#3A1111]">
                <AlertTriangle size={32} color="#F87171" />
              </View>
              <Text className="text-center text-xl font-bold text-white">Algo deu errado</Text>
              <Text className="text-center text-sm text-text-muted">
                Ocorreu um erro inesperado no aplicativo. Você pode tentar novamente ou copiar os
                detalhes para reportar.
              </Text>
            </View>

            <View className="rounded-2xl border border-border bg-card p-4 gap-2">
              <Text className="text-xs uppercase text-text-faint">Mensagem</Text>
              <Text className="text-sm text-white" selectable>
                {message}
              </Text>
              {eventId ? (
                <>
                  <Text className="mt-2 text-xs uppercase text-text-faint">Event ID</Text>
                  <Text className="text-xs text-text-secondary" selectable>
                    {eventId}
                  </Text>
                </>
              ) : null}
            </View>

            {__DEV__ && stack ? (
              <View className="rounded-2xl border border-border bg-card p-4 gap-2">
                <Text className="text-xs uppercase text-text-faint">Stack (dev)</Text>
                <ScrollView className="max-h-56" showsVerticalScrollIndicator>
                  <Text className="text-[11px] text-text-muted" selectable>
                    {stack}
                  </Text>
                </ScrollView>
              </View>
            ) : null}

            <View className="gap-3">
              <Pressable
                className="h-12 flex-row items-center justify-center gap-2 rounded-xl bg-[#FF6B35]"
                onPress={this.reset}
              >
                <RefreshCw size={16} color="#FFFFFF" />
                <Text className="text-base font-semibold text-white">Tentar novamente</Text>
              </Pressable>

              <Pressable
                className="h-12 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-surface"
                onPress={() => void this.copy()}
              >
                <Copy size={16} color={copied ? '#22C55E' : '#FFFFFF'} />
                <Text className={`text-base font-semibold ${copied ? 'text-green-500' : 'text-white'}`}>
                  {copied ? 'Copiado!' : 'Copiar detalhes'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}
