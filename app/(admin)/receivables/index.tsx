import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Select } from '@/components/ui/Select';
import { SubmenuHeaderCard } from '@/components/ui/SubmenuHeaderCard';
import { receivablesService, type Receivable } from '@/services/receivablesService';

type StatusFilter = Receivable['status'] | 'ALL';

const statusOptions: Array<{ label: string; value: StatusFilter }> = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Pendentes', value: 'pending' },
  { label: 'Pagos', value: 'paid' },
  { label: 'Vencidos', value: 'overdue' },
  { label: 'Cancelados', value: 'cancelled' },
];

const statusConfig: Record<Receivable['status'], { label: string; color: string; bg: string }> = {
  pending: { label: 'Pendente', color: '#D97706', bg: '#1c1400' },
  paid: { label: 'Pago', color: '#16A34A', bg: '#0a1f0a' },
  overdue: { label: 'Vencido', color: '#DC2626', bg: '#1f0a0a' },
  cancelled: { label: 'Cancelado', color: '#6B7280', bg: '#111111' },
};

export default function ReceivablesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const loadData = async (filter: StatusFilter) => {
    setLoading(true);
    try {
      const data = await receivablesService.listReceivables(
        filter !== 'ALL' ? { status: filter } : undefined,
      );
      setReceivables(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData(statusFilter);
  }, [statusFilter]);

  const totalAmount = receivables.reduce((sum, r) => sum + r.amount, 0);
  const pendingAmount = receivables
    .filter((r) => r.status === 'pending' || r.status === 'overdue')
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['left', 'right']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}>
        <SubmenuHeaderCard
          onBack={() => router.replace('/(admin)')}
          title="Recebíveis"
          subtitle="Gestão de cobranças e status de pagamentos."
        />

        {/* Totalizadores */}
        <View className="flex-row gap-3">
          <View className="flex-1 rounded-2xl border border-border bg-surface p-4">
            <Text className="text-xs text-text-muted">Total filtrado</Text>
            <Text className="mt-1 text-lg font-bold text-white">
              {totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          </View>
          <View className="flex-1 rounded-2xl border border-border bg-surface p-4">
            <Text className="text-xs text-text-muted">Em aberto</Text>
            <Text className="mt-1 text-lg font-bold text-[#F59E0B]">
              {pendingAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          </View>
        </View>

        {/* Filtro de status */}
        <Select
          label="Filtrar por status"
          value={statusFilter}
          options={statusOptions}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        />

        {/* Lista */}
        {loading ? (
          <View className="items-center py-12">
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text className="mt-3 text-sm text-text-muted">Carregando recebíveis...</Text>
          </View>
        ) : receivables.length === 0 ? (
          <View className="items-center rounded-2xl border border-border bg-surface py-12">
            <Text className="text-base font-semibold text-white">Nenhum recebível encontrado</Text>
            <Text className="mt-1 text-sm text-text-muted">
              {statusFilter === 'ALL' ? 'Não há registros cadastrados.' : 'Nenhum item com esse status.'}
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {receivables.map((item) => {
              const cfg = statusConfig[item.status];
              return (
                <View
                  key={item.id}
                  className="rounded-2xl border border-border bg-surface p-4"
                >
                  <View className="mb-2 flex-row items-start justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-base font-semibold text-white" numberOfLines={1}>
                        {item.customer_name}
                      </Text>
                      {item.description ? (
                        <Text className="mt-0.5 text-xs text-text-muted" numberOfLines={1}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                    <View
                      className="rounded-full px-3 py-1"
                      style={{ backgroundColor: cfg.bg }}
                    >
                      <Text className="text-xs font-semibold" style={{ color: cfg.color }}>
                        {cfg.label}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row justify-between">
                    <View>
                      <Text className="text-xs text-text-faint">Valor</Text>
                      <Text className="text-base font-bold text-white">
                        {item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-xs text-text-faint">Vencimento</Text>
                      <Text className="text-sm text-text-secondary">
                        {new Date(`${item.due_date}T00:00:00`).toLocaleDateString('pt-BR')}
                      </Text>
                    </View>
                  </View>

                  {item.contract_ref ? (
                    <Text className="mt-2 text-xs text-text-faint">Ref: {item.contract_ref}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
