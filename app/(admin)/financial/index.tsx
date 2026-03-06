import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { DollarSign, TrendingDown, TrendingUp, Wallet } from 'lucide-react-native';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { SubmenuHeaderCard } from '@/components/ui/SubmenuHeaderCard';
import { adminService, type FinancialMetrics } from '@/services/adminService';

const emptyMetrics: FinancialMetrics = {
  totalRevenue: 0,
  mrr: 0,
  pendingAmount: 0,
  activeSubscriptions: 0,
  churnRate: 0,
  averageTicket: 0,
};

export default function FinancialDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<FinancialMetrics>(emptyMetrics);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await adminService.getFinancialMetrics();
      setMetrics(data);
      setLoading(false);
    };
    void load();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['left', 'right']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}>
        <SubmenuHeaderCard
          onBack={() => router.navigate('/(admin)/mais')}
          title="Dashboard Financeiro"
          subtitle="Resumo de receita, inadimplência, churn e ticket médio."
        />

        {loading ? (
          <View className="py-8">
            <ActivityIndicator color="#FF6B35" />
            <Text className="mt-2 text-center text-sm text-[#9CA3AF]">Carregando dados financeiros...</Text>
          </View>
        ) : (
          <View className="gap-3">
            <AdminStatCard
              title="Receita Recebida"
              value={metrics.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              icon={DollarSign}
              tone="green"
            />
            <AdminStatCard
              title="MRR"
              value={metrics.mrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              icon={TrendingUp}
              tone="blue"
              subtitle={`${metrics.activeSubscriptions} assinaturas ativas`}
            />
            <AdminStatCard
              title="Inadimplencia"
              value={metrics.pendingAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              icon={TrendingDown}
              tone="red"
            />
            <AdminStatCard title="Taxa de Churn" value={`${metrics.churnRate.toFixed(1)}%`} icon={TrendingUp} tone="orange" />
            <AdminStatCard
              title="Ticket Medio"
              value={metrics.averageTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              icon={Wallet}
              tone="gray"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
