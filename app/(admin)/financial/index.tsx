import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, DollarSign, TrendingDown, TrendingUp, Wallet } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { SubmenuHeaderCard } from '@/components/ui/SubmenuHeaderCard';
import { adminService, type FinancialMetrics } from '@/services/adminService';
import { receivablesService, type Receivable } from '@/services/receivablesService';

const emptyMetrics: FinancialMetrics = {
  totalRevenue: 0,
  mrr: 0,
  pendingAmount: 0,
  activeSubscriptions: 0,
  churnRate: 0,
  averageTicket: 0,
};

const formatBRL = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function FinancialDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<FinancialMetrics>(emptyMetrics);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [receivablesLoading, setReceivablesLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await adminService.getFinancialMetrics();
      setMetrics(data);
      setLoading(false);
    };
    const loadReceivables = async () => {
      setReceivablesLoading(true);
      try {
        const data = await receivablesService.listReceivables();
        setReceivables(data);
      } finally {
        setReceivablesLoading(false);
      }
    };
    void load();
    void loadReceivables();
  }, []);

  const receivablesTotals = useMemo(() => {
    return receivables.reduce(
      (acc, r) => {
        if (r.status === 'paid') acc.paid += r.amount;
        else if (r.status === 'pending') acc.pending += r.amount;
        else if (r.status === 'overdue') acc.overdue += r.amount;
        return acc;
      },
      { paid: 0, pending: 0, overdue: 0 },
    );
  }, [receivables]);

  const recentReceivables = useMemo(() => {
    return [...receivables]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);
  }, [receivables]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['left', 'right']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}>
        <SubmenuHeaderCard
          onBack={() => router.navigate('/(admin)/mais')}
          title="Dashboard Financeiro"
          subtitle="Resumo de receita, inadimplência, churn e ticket médio."
        />

        {loading ? (
          <View className="py-8">
            <ActivityIndicator color="#FF6B35" />
            <Text className="mt-2 text-center text-sm text-text-muted">Carregando dados financeiros...</Text>
          </View>
        ) : (
          <View className="gap-3">
            <AdminStatCard
              title="Receita Recebida"
              value={formatBRL(metrics.totalRevenue)}
              icon={DollarSign}
              tone="green"
            />
            <AdminStatCard
              title="MRR"
              value={formatBRL(metrics.mrr)}
              icon={TrendingUp}
              tone="blue"
              subtitle={`${metrics.activeSubscriptions} assinaturas ativas`}
            />
            <AdminStatCard
              title="Inadimplencia"
              value={formatBRL(metrics.pendingAmount)}
              icon={TrendingDown}
              tone="red"
            />
            <AdminStatCard title="Taxa de Churn" value={`${metrics.churnRate.toFixed(1)}%`} icon={TrendingUp} tone="orange" />
            <AdminStatCard
              title="Ticket Medio"
              value={formatBRL(metrics.averageTicket)}
              icon={Wallet}
              tone="gray"
            />
          </View>
        )}

        {/* Recebíveis por Status */}
        <View className="rounded-2xl border border-border bg-surface p-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-base font-semibold text-white">Recebíveis por Status</Text>
            <Pressable
              className="flex-row items-center gap-1"
              onPress={() => router.push('/(admin)/receivables')}
            >
              <Text className="text-xs text-[#FF6B35]">Ver todos</Text>
              <ChevronRight stroke="#FF6B35" size={14} />
            </Pressable>
          </View>

          {receivablesLoading ? (
            <View className="py-6">
              <ActivityIndicator color="#FF6B35" />
              <Text className="mt-2 text-center text-sm text-text-muted">Carregando recebíveis...</Text>
            </View>
          ) : (
            <>
              <View className="mb-3 flex-row gap-2">
                <StatusTotal label="Pago" amount={receivablesTotals.paid} color="#16A34A" />
                <StatusTotal label="Pendente" amount={receivablesTotals.pending} color="#F59E0B" />
                <StatusTotal label="Vencido" amount={receivablesTotals.overdue} color="#DC2626" />
              </View>

              {recentReceivables.length === 0 ? (
                <View className="items-center rounded-xl border border-border bg-card p-4">
                  <Text className="text-sm text-text-muted">Nenhum recebível cadastrado.</Text>
                </View>
              ) : (
                <View className="gap-2">
                  {recentReceivables.map((item) => (
                    <View
                      key={item.id}
                      className="flex-row items-center justify-between rounded-xl border border-border bg-card p-3"
                    >
                      <View className="flex-1 pr-3">
                        <Text className="text-sm font-semibold text-white" numberOfLines={1}>
                          {item.customer_name}
                        </Text>
                        <Text className="text-xs text-text-muted">
                          Venc. {new Date(`${item.due_date}T00:00:00`).toLocaleDateString('pt-BR')}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-sm font-bold text-white">{formatBRL(item.amount)}</Text>
                        <Text className="text-[10px] uppercase" style={{ color: statusColor(item.status) }}>
                          {statusLabel(item.status)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusTotal({ label, amount, color }: { label: string; amount: number; color: string }) {
  return (
    <View className="flex-1 rounded-xl border border-border bg-card p-3">
      <Text className="text-[10px] uppercase" style={{ color }}>{label}</Text>
      <Text className="mt-1 text-sm font-bold text-white" numberOfLines={1}>
        {formatBRL(amount)}
      </Text>
    </View>
  );
}

function statusLabel(status: Receivable['status']): string {
  switch (status) {
    case 'paid': return 'Pago';
    case 'pending': return 'Pendente';
    case 'overdue': return 'Vencido';
    case 'cancelled': return 'Cancelado';
  }
}

function statusColor(status: Receivable['status']): string {
  switch (status) {
    case 'paid': return '#16A34A';
    case 'pending': return '#F59E0B';
    case 'overdue': return '#DC2626';
    case 'cancelled': return '#6B7280';
  }
}
