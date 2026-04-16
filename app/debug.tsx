import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { AlertTriangle, Bug, RefreshCw, Server, Timer } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BootstrapWatchdogFallback } from '@/components/BootstrapWatchdog';
import { SubmenuHeaderCard } from '@/components/ui/SubmenuHeaderCard';
import { ErrorScreen } from '@/components/ui/ErrorScreen';
import { buildErrorReport } from '@/utils/errorReport';

type Scenario = 'none' | 'error-screen' | 'bootstrap-watchdog';

/**
 * Componente auxiliar que lança um erro durante a renderização.
 * Usado para testar o ErrorBoundary que envolve todo o app em _layout.tsx.
 */
function CrashNow(): null {
  throw new Error('Erro simulado: botão "Simular crash" da tela de debug');
}

export default function DebugScreen() {
  const router = useRouter();
  const [shouldCrash, setShouldCrash] = useState(false);
  const [scenario, setScenario] = useState<Scenario>('none');
  const [elapsed, setElapsed] = useState(8);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [copied, setCopied] = useState(false);

  // Incrementa o contador quando o cenário do watchdog está ativo
  useEffect(() => {
    if (scenario === 'bootstrap-watchdog') {
      elapsedTimerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
      setElapsed(8);
    }
    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, [scenario]);

  // Cenário 1: ErrorBoundary — lança erro na próxima renderização
  if (shouldCrash) {
    return <CrashNow />;
  }

  // Cenário 3: BootstrapWatchdog — renderiza o fallback isoladamente
  if (scenario === 'bootstrap-watchdog') {
    const handleCopy = async () => {
      const report = buildErrorReport(`Bootstrap travado por ${elapsed}s (simulado)`, {
        stage: 'debug-watchdog-simulation',
        extra: { simulated: true, elapsed_seconds: elapsed },
      });
      try {
        await Clipboard.setStringAsync(report);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        // ignore
      }
    };

    return (
      <View className="flex-1 bg-background" style={{ backgroundColor: '#0A0A0A' }}>
        <BootstrapWatchdogFallback
          elapsedSeconds={elapsed}
          copied={copied}
          onRetry={() => setScenario('none')}
          onCopy={() => void handleCopy()}
        />
        <Pressable
          className="absolute bottom-8 left-4 right-4 h-11 items-center justify-center rounded-xl border border-border bg-surface"
          onPress={() => setScenario('none')}
        >
          <Text className="text-sm font-semibold text-white">← Voltar para debug</Text>
        </Pressable>
      </View>
    );
  }

  // Cenário 2: ErrorScreen — renderiza in-place com retry
  if (scenario === 'error-screen') {
    return (
      <SafeAreaView
        className="flex-1 bg-background"
        style={{ backgroundColor: '#0A0A0A' }}
        edges={['left', 'right', 'top', 'bottom']}
      >
        <ErrorScreen
          title="Não foi possível carregar"
          message="Erro simulado de requisição: failed to fetch /api/dashboard (timeout após 30s)"
          details={
            'Stack trace simulado:\n' +
            '  at salesService.getMonthSales (services/salesService.ts:130)\n' +
            '  at useDashboardData.loadData (hooks/useDashboardData.ts:126)\n' +
            '  at async Promise.all (index 0)\n' +
            '\n' +
            'Response: 504 Gateway Timeout\n' +
            'Request ID: req_simulated_abc123'
          }
          onRetry={() => setScenario('none')}
          fullScreen
        />
      </SafeAreaView>
    );
  }

  // Tela principal do debug — lista de cenários
  return (
    <SafeAreaView
      className="flex-1 bg-background"
      style={{ backgroundColor: '#0A0A0A' }}
      edges={['left', 'right']}
    >
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}>
        <SubmenuHeaderCard
          onBack={() => router.back()}
          title="Debug / Simulação de erros"
          subtitle="Valide as telas de erro sem precisar quebrar o app."
        />

        <View className="rounded-2xl border border-[#F59E0B]/40 bg-[#3D2C0F]/30 p-4">
          <Text className="text-xs text-[#F59E0B]">
            ⚠ Esta tela é apenas para validação. Remova o atalho no menu "Mais" quando terminar os testes.
          </Text>
        </View>

        <ScenarioCard
          icon={Bug}
          title="1. Simular crash (ErrorBoundary)"
          description="Lança um erro durante a renderização. Deve disparar o ErrorBoundary root e mostrar a tela 'Algo deu errado' com mensagem, event ID (se Sentry) e botões 'Tentar novamente' e 'Copiar detalhes'."
          buttonLabel="Crashar agora"
          onPress={() => setShouldCrash(true)}
        />

        <ScenarioCard
          icon={Server}
          title="2. Simular erro de carregamento (ErrorScreen)"
          description="Abre o ErrorScreen com título, mensagem, accordion de detalhes expansível e botão 'Tentar novamente' — o mesmo padrão usado nos dashboards de gestor/vendedor quando a API falha."
          buttonLabel="Simular erro de API"
          onPress={() => setScenario('error-screen')}
        />

        <ScenarioCard
          icon={Timer}
          title="3. Simular bootstrap travado (Watchdog)"
          description="Renderiza o fallback do BootstrapWatchdog (8s+ sem primeira tela). Deve mostrar 'Demorando mais que o esperado' com botões 'Recarregar' e 'Copiar diagnóstico'."
          buttonLabel="Mostrar watchdog"
          onPress={() => setScenario('bootstrap-watchdog')}
        />

        <View className="rounded-2xl border border-border bg-surface p-4">
          <Text className="mb-2 text-sm font-semibold text-white">Como validar no iOS</Text>
          <Text className="text-xs text-text-muted">
            Em cada cenário, confirme: (1) o fundo é sempre escuro — nunca branco; (2) o texto é legível;
            (3) os botões respondem ao toque; (4) "Copiar detalhes/diagnóstico" coloca o texto no clipboard
            (cole em qualquer app para verificar o conteúdo).
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface ScenarioCardProps {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  description: string;
  buttonLabel: string;
  onPress: () => void;
}

function ScenarioCard({ icon: Icon, title, description, buttonLabel, onPress }: ScenarioCardProps) {
  return (
    <View className="rounded-2xl border border-border bg-surface p-4 gap-3">
      <View className="flex-row items-center gap-3">
        <View className="rounded-lg bg-[#2A1A12] p-2">
          <Icon size={18} color="#FF6B35" />
        </View>
        <Text className="flex-1 text-base font-semibold text-white">{title}</Text>
      </View>
      <Text className="text-sm text-text-muted">{description}</Text>
      <Pressable
        className="h-11 flex-row items-center justify-center gap-2 rounded-xl bg-[#FF6B35]"
        onPress={onPress}
      >
        <AlertTriangle size={16} color="#FFFFFF" />
        <Text className="text-base font-semibold text-white">{buttonLabel}</Text>
      </Pressable>
    </View>
  );
}
