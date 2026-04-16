import * as Clipboard from 'expo-clipboard';
import { AlertTriangle, Copy, RefreshCw } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { DevSettings, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { hasFirstScreenRendered, markBootstrapStage } from '@/lib/bootstrap-diagnostics';
import { buildErrorReport } from '@/utils/errorReport';

const WATCHDOG_MS = 8000;

interface BootstrapWatchdogProps {
  children: React.ReactNode;
}

export function BootstrapWatchdog({ children }: BootstrapWatchdogProps) {
  const [stalled, setStalled] = useState(false);
  const [copied, setCopied] = useState(false);
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    if (hasFirstScreenRendered()) return;

    const timer = setTimeout(() => {
      if (!hasFirstScreenRendered()) {
        markBootstrapStage('bootstrap-watchdog-visible', { timeout_ms: WATCHDOG_MS });
        setStalled(true);
      }
    }, WATCHDOG_MS);

    return () => clearTimeout(timer);
  }, []);

  const elapsedSeconds = Math.round((Date.now() - startedAtRef.current) / 1000);

  const handleRetry = () => {
    setStalled(false);
    startedAtRef.current = Date.now();
    if (__DEV__) {
      try {
        DevSettings.reload();
        return;
      } catch {
        // fallback abaixo
      }
    }
    // Em produção, não há API cross-platform para reiniciar o bundle sem expo-updates.
    // O reset do state acima já re-monta o watchdog; se a causa raiz persistir ele
    // reaparece após novos 8s.
  };

  const handleCopy = async () => {
    const report = buildErrorReport(`Bootstrap travado por ${elapsedSeconds}s`, {
      stage: 'bootstrap-watchdog',
      extra: { platform: Platform.OS, elapsed_seconds: elapsedSeconds },
    });
    try {
      await Clipboard.setStringAsync(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  if (!stalled) return <>{children}</>;

  return (
    <BootstrapWatchdogFallback
      elapsedSeconds={elapsedSeconds}
      copied={copied}
      onRetry={handleRetry}
      onCopy={() => void handleCopy()}
    />
  );
}

interface BootstrapWatchdogFallbackProps {
  elapsedSeconds: number;
  copied?: boolean;
  onRetry: () => void;
  onCopy: () => void;
}

export function BootstrapWatchdogFallback({
  elapsedSeconds,
  copied = false,
  onRetry,
  onCopy,
}: BootstrapWatchdogFallbackProps) {
  return (
    <SafeAreaView
      className="flex-1 bg-background"
      style={{ backgroundColor: '#0A0A0A' }}
      edges={['left', 'right', 'top', 'bottom']}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingBottom: 32, gap: 16, flexGrow: 1, justifyContent: 'center' }}
      >
        <View className="items-center gap-3">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-[#3D2C0F]">
            <AlertTriangle size={32} color="#F59E0B" />
          </View>
          <Text className="text-center text-xl font-bold text-white">
            Demorando mais que o esperado
          </Text>
          <Text className="text-center text-sm text-text-muted">
            O aplicativo não conseguiu iniciar em {elapsedSeconds}s. Isso pode ser conexão
            instável ou um problema temporário.
          </Text>
        </View>

        <View className="gap-3">
          <Pressable
            className="h-12 flex-row items-center justify-center gap-2 rounded-xl bg-[#FF6B35]"
            onPress={onRetry}
          >
            <RefreshCw size={16} color="#FFFFFF" />
            <Text className="text-base font-semibold text-white">Recarregar</Text>
          </Pressable>

          <Pressable
            className="h-12 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-surface"
            onPress={onCopy}
          >
            <Copy size={16} color={copied ? '#22C55E' : '#FFFFFF'} />
            <Text className={`text-base font-semibold ${copied ? 'text-green-500' : 'text-white'}`}>
              {copied ? 'Copiado!' : 'Copiar diagnóstico'}
            </Text>
          </Pressable>
        </View>

        {!__DEV__ ? (
          <Text className="text-center text-xs text-text-faint">
            Se o problema persistir, feche o app completamente e abra novamente.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
