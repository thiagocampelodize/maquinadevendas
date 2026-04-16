import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { SubmenuHeaderCard } from '@/components/ui/SubmenuHeaderCard';
import { useToastContext } from '@/contexts/ToastContext';
import { adminService, type AdminSubscriptionRow, type CheckoutSessionRow, type CheckoutStatus } from '@/services/adminService';

const statusOptions: Array<{ label: string; value: CheckoutStatus | 'ALL' }> = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Criado', value: 'CREATED' },
  { label: 'Pendente', value: 'PENDING' },
  { label: 'Pago', value: 'PAID' },
  { label: 'Ativação pendente', value: 'ACTIVATION_PENDING' },
  { label: 'Ativado', value: 'ACTIVATED' },
  { label: 'Expirado', value: 'EXPIRED' },
  { label: 'Cancelado', value: 'CANCELLED' },
  { label: 'Falhou', value: 'FAILED' },
];

const pageSize = 8;

export default function SubscriptionsManagementPage() {
  const router = useRouter();
  const toast = useToastContext();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionRow[]>([]);
  const [sessions, setSessions] = useState<CheckoutSessionRow[]>([]);

  const [statusFilter, setStatusFilter] = useState<CheckoutStatus | 'ALL'>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const loadIdRef = useRef(0);

  const loadData = async (showRefresh = false) => {
    const loadId = ++loadIdRef.current;
    const isCurrentLoad = () => loadId === loadIdRef.current;

    if (showRefresh) {
      if (isCurrentLoad()) setRefreshing(true);
    } else if (isCurrentLoad()) {
      setLoading(true);
    }

    try {
      if (isCurrentLoad()) setLoadError(null);
      const [subscriptionData, sessionData] = await Promise.all([
        adminService.getSubscriptions(),
        adminService.getCheckoutSessions({ status: statusFilter, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
      ]);

      if (!isCurrentLoad()) return;
      setSubscriptions(subscriptionData);
      setSessions(sessionData);
      setPage(1);
    } catch {
      if (isCurrentLoad()) {
        setLoadError('Não foi possível carregar os dados de assinaturas.');
      }
    }

    if (showRefresh) {
      if (isCurrentLoad()) setRefreshing(false);
    } else if (isCurrentLoad()) {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();

    return () => {
      loadIdRef.current += 1;
    };
  }, [statusFilter, dateFrom, dateTo]);

  const summary = useMemo(() => {
    return {
      active: subscriptions.filter((item) => item.status === 'active').length,
      pending: subscriptions.filter((item) => item.status === 'pending').length,
      overdue: subscriptions.filter((item) => item.status === 'overdue').length,
      cancelled: subscriptions.filter((item) => item.status === 'cancelled').length,
    };
  }, [subscriptions]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sessions.slice(start, start + pageSize);
  }, [page, sessions]);
  const totalPages = Math.max(1, Math.ceil(sessions.length / pageSize));

  const handleResend = async (sessionId: string) => {
    setResendingId(sessionId);
    const result = await adminService.resendActivation(sessionId);
    setResendingId(null);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
  };

  const clearFilters = () => {
    setStatusFilter('ALL');
    setDateFrom('');
    setDateTo('');
  };

  const getSessionStatusLabel = (status: CheckoutStatus): string => {
    if (status === 'CREATED') return 'Criado';
    if (status === 'PENDING') return 'Pendente';
    if (status === 'PAID') return 'Pago';
    if (status === 'ACTIVATION_PENDING') return 'Ativação pendente';
    if (status === 'ACTIVATED') return 'Ativado';
    if (status === 'EXPIRED') return 'Expirado';
    if (status === 'CANCELLED') return 'Cancelado';
    return 'Falhou';
  };

  const startRow = sessions.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, sessions.length);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['left', 'right']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}>
        <SubmenuHeaderCard
          onBack={() => router.navigate('/(admin)/mais')}
          title="Assinaturas (Site)"
          subtitle="Sessões de checkout, ativação e status de assinaturas."
        />

        <View className="rounded-2xl border border-border bg-surface p-4">
          <View className="flex-row flex-wrap gap-2">
            <Tag text={`Ativas: ${summary.active}`} tone="green" />
            <Tag text={`Pendentes: ${summary.pending}`} tone="yellow" />
            <Tag text={`Atrasadas: ${summary.overdue}`} tone="red" />
            <Tag text={`Canceladas: ${summary.cancelled}`} tone="gray" />
          </View>
        </View>

        <View className="rounded-2xl border border-border bg-surface p-4">
            <Text className="mb-3 text-base font-semibold text-white">Filtros de sessão</Text>
          <View className="gap-3">
            <Select label="Status" value={statusFilter} onValueChange={(value) => setStatusFilter(value as CheckoutStatus | 'ALL')} options={statusOptions} />
            <Field label="Data inicial (YYYY-MM-DD)" value={dateFrom} onChangeText={setDateFrom} placeholder="2026-03-01" />
            <Field label="Data final (YYYY-MM-DD)" value={dateTo} onChangeText={setDateTo} placeholder="2026-03-31" />
            <View className="flex-row gap-2">
              <Button className="flex-1" loading={refreshing} onPress={() => void loadData(true)}>
                Atualizar
              </Button>
              <Button className="flex-1" variant="outline" onPress={clearFilters}>
                Limpar
              </Button>
            </View>
          </View>
        </View>

        <View className="rounded-2xl border border-border bg-surface p-4">
          <Text className="text-base font-semibold text-white">Sessões de checkout</Text>
          <Text className="mt-1 text-xs text-text-faint">{`Mostrando ${startRow}-${endRow} de ${sessions.length} sessões`}</Text>
          {loading ? (
            <View className="py-8">
              <ActivityIndicator color="#FF6B35" />
              <Text className="mt-2 text-center text-sm text-text-muted">Carregando sessões...</Text>
            </View>
          ) : loadError ? (
            <View className="py-8">
              <Text className="text-center text-sm text-[#F87171]">{loadError}</Text>
              <Button className="mt-3" onPress={() => void loadData(true)}>
                Tentar novamente
              </Button>
            </View>
          ) : (
            <>
              <View className="mt-3 gap-2">
                {paginated.map((session) => (
                  <View key={session.id} className="rounded-xl border border-border bg-card p-3">
                    <Text className="text-sm font-semibold text-white">{session.customer_name}</Text>
                    <Text className="mt-1 text-xs text-text-muted">{session.customer_email}</Text>
                    <Text className="text-xs text-text-muted">{session.plan_code} • {session.users_count} usuários</Text>
                    <View className="mt-2 flex-row items-center justify-between">
                      <Text className="text-xs text-white">{Number(session.cycle_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Text>
                      <Text className={`text-xs font-semibold ${session.status === 'ACTIVATED' ? 'text-[#34D399]' : session.status === 'FAILED' || session.status === 'CANCELLED' ? 'text-[#F87171]' : 'text-[#F59E0B]'}`}>
                        {getSessionStatusLabel(session.status)}
                      </Text>
                    </View>

                    <View className="mt-3 flex-row gap-2">
                      <Pressable
                        disabled={!session.checkout_url}
                        className={`h-9 flex-1 items-center justify-center rounded-lg border ${session.checkout_url ? 'border-border bg-surface' : 'border-border bg-card'}`}
                        onPress={() => {
                          if (!session.checkout_url) return;
                          void Linking.openURL(session.checkout_url);
                        }}
                      >
                        <Text className={`text-xs font-semibold ${session.checkout_url ? 'text-text-secondary' : 'text-text-faint'}`}>Abrir checkout</Text>
                      </Pressable>
                      <Pressable className="h-9 flex-1 items-center justify-center rounded-lg border border-[#FF6B35] bg-[#2A1A12]" onPress={() => void handleResend(session.id)}>
                        {resendingId === session.id ? <ActivityIndicator size="small" color="#FF6B35" /> : <Text className="text-xs font-semibold text-[#FF6B35]">Reenviar ativação</Text>}
                      </Pressable>
                    </View>
                  </View>
                ))}

                {sessions.length === 0 ? <Text className="py-6 text-center text-sm text-text-muted">Nenhuma sessao encontrada para os filtros.</Text> : null}
              </View>

              <View className="mt-4 flex-row items-center justify-between">
                <Pressable disabled={page <= 1} onPress={() => setPage((p) => Math.max(1, p - 1))} className={`rounded-lg border px-3 py-2 ${page <= 1 ? 'border-border bg-card' : 'border-[#FF6B35] bg-[#2A1A12]'}`}>
                  <Text className={`text-xs font-semibold ${page <= 1 ? 'text-text-faint' : 'text-[#FF6B35]'}`}>Anterior</Text>
                </Pressable>
                <Text className="text-xs text-text-muted">Página {page} de {totalPages}</Text>
                <Pressable
                  disabled={page >= totalPages}
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={`rounded-lg border px-3 py-2 ${page >= totalPages ? 'border-border bg-card' : 'border-[#FF6B35] bg-[#2A1A12]'}`}
                >
                  <Text className={`text-xs font-semibold ${page >= totalPages ? 'text-text-faint' : 'text-[#FF6B35]'}`}>Próxima</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Tag({ text, tone }: { text: string; tone: 'green' | 'yellow' | 'red' | 'gray' }) {
  const bg = tone === 'green' ? '#153A2E' : tone === 'yellow' ? '#3D2C0F' : tone === 'red' ? '#3D1616' : '#1F2937';
  const color = tone === 'green' ? '#34D399' : tone === 'yellow' ? '#F59E0B' : tone === 'red' ? '#F87171' : '#9CA3AF';
  return (
    <View className="rounded-md px-2 py-1" style={{ backgroundColor: bg }}>
      <Text className="text-xs font-semibold" style={{ color }}>
        {text}
      </Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View>
      <Text className="mb-2 text-sm text-text-secondary">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
        autoCapitalize="none"
        className="h-12 rounded-xl border border-border bg-card px-3 text-white"
      />
    </View>
  );
}
