import { useRouter } from 'expo-router';
import {
  Activity,
  BarChart3,
  Bug,
  Building2,
  DollarSign,
  Lock,
  Receipt,
  Settings,
} from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const modules = [
  {
    label: 'Financeiro',
    subtitle: 'MRR, inadimplência e ticket médio',
    icon: DollarSign,
    route: '/(admin)/financial' as const,
  },
  {
    label: 'Recebíveis',
    subtitle: 'Cobranças e status de pagamento',
    icon: Receipt,
    route: '/(admin)/receivables' as const,
  },
  {
    label: 'Assinaturas',
    subtitle: 'Status de contratos ativos',
    icon: Activity,
    route: '/(admin)/subscriptions' as const,
  },
  {
    label: 'Preços / Planos',
    subtitle: 'Regras de plano por usuário',
    icon: Settings,
    route: '/(admin)/plans' as const,
  },
  {
    label: 'Acesso Temporário',
    subtitle: 'Liberações temporárias de acesso',
    icon: Lock,
    route: '/(admin)/temp-access' as const,
  },
  {
    label: 'Relatórios',
    subtitle: 'Exportações e analíticos',
    icon: BarChart3,
    route: '/(admin)/reports' as const,
  },
  {
    label: 'Consolidado',
    subtitle: 'Saúde geral dos módulos',
    icon: Building2,
    route: '/(admin)/consolidated' as const,
  },
  // {
  //   label: 'Debug / Simulação',
  //   subtitle: 'Validar telas de erro (remover após testes)',
  //   icon: Bug,
  //   route: '/debug' as const,
  // },
];

export default function MaisPage() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['left', 'right']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 28 }}>
        <View className="rounded-2xl border border-border bg-surface p-4">
          <Text className="text-xl font-bold text-white">Mais módulos</Text>
          <Text className="mt-1 text-sm text-text-muted">Acesse os demais recursos do painel administrativo.</Text>
        </View>

        <View className="gap-2">
          {modules.map((item) => (
            <Pressable
              key={item.route}
              className="flex-row items-center gap-3 rounded-xl border border-border bg-surface p-4"
              onPress={() => router.push(item.route)}
            >
              <View className="rounded-lg bg-[#2A1A12] p-3">
                <item.icon size={18} color="#FF6B35" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-white">{item.label}</Text>
                <Text className="mt-0.5 text-xs text-text-muted">{item.subtitle}</Text>
              </View>
              <Text className="text-text-faint">›</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
