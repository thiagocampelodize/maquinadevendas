import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SubmenuActionsCard } from '@/components/ui/SubmenuActionsCard';
import { SubmenuHeaderCard } from '@/components/ui/SubmenuHeaderCard';
import { useAuth } from '@/contexts/AuthContext';
import { salesService } from '@/services/salesService';
import { formatDateToISO, formatMonthToYYYYMM, getBrazilDate } from '@/utils/dateUtils';

export default function VendedorPerformancePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [currentMonthTotal, setCurrentMonthTotal] = useState(0);
  const [currentMonthCount, setCurrentMonthCount] = useState(0);
  const [previousMonthTotal, setPreviousMonthTotal] = useState(0);
  const [previousMonthCount, setPreviousMonthCount] = useState(0);
  const [last7Total, setLast7Total] = useState(0);
  const [prev7Total, setPrev7Total] = useState(0);

  const companyId = user?.company_id;
  const userId = user?.id;

  useEffect(() => {
    const load = async () => {
      if (!companyId || !userId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const now = getBrazilDate();
        const currentMonth = formatMonthToYYYYMM(now);
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousMonth = formatMonthToYYYYMM(prevMonthDate);

        const [currentMonthSales, previousMonthSales] = await Promise.all([
          salesService.getMonthSales(companyId, currentMonth),
          salesService.getMonthSales(companyId, previousMonth),
        ]);

        const currentMine = currentMonthSales.filter((sale) => sale.seller_id === userId);
        const previousMine = previousMonthSales.filter((sale) => sale.seller_id === userId);

        setCurrentMonthTotal(currentMine.reduce((acc, sale) => acc + sale.value, 0));
        setCurrentMonthCount(currentMine.length);
        setPreviousMonthTotal(previousMine.reduce((acc, sale) => acc + sale.value, 0));
        setPreviousMonthCount(previousMine.length);

        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const start = new Date(end);
        start.setDate(end.getDate() - 6);

        const prevEnd = new Date(start);
        prevEnd.setDate(start.getDate() - 1);
        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevEnd.getDate() - 6);

        const [last7Sales, prev7Sales] = await Promise.all([
          salesService.getSalesByDateRange(companyId, formatDateToISO(start), formatDateToISO(end)),
          salesService.getSalesByDateRange(companyId, formatDateToISO(prevStart), formatDateToISO(prevEnd)),
        ]);

        const last7Mine = last7Sales.filter((sale) => sale.seller_id === userId);
        const prev7Mine = prev7Sales.filter((sale) => sale.seller_id === userId);

        setLast7Total(last7Mine.reduce((acc, sale) => acc + sale.value, 0));
        setPrev7Total(prev7Mine.reduce((acc, sale) => acc + sale.value, 0));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [companyId, userId]);

  const monthVariation = useMemo(() => {
    if (previousMonthTotal <= 0) return currentMonthTotal > 0 ? 100 : 0;
    return ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100;
  }, [currentMonthTotal, previousMonthTotal]);

  const weekVariation = useMemo(() => {
    if (prev7Total <= 0) return last7Total > 0 ? 100 : 0;
    return ((last7Total - prev7Total) / prev7Total) * 100;
  }, [last7Total, prev7Total]);

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['left', 'right']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}>
        <SubmenuHeaderCard
          onBack={() => router.replace('/(vendedor)/perfil')}
          title="Meu desempenho"
          subtitle="Acompanhe sua evolução e compare períodos."
        />

        {loading ? (
          <View className="rounded-2xl border border-[#2D2D2D] bg-[#111111] p-4">
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#FF6B35" />
              <Text className="text-sm text-[#9CA3AF]">Carregando seu desempenho...</Text>
            </View>
          </View>
        ) : (
          <>
            <SubmenuActionsCard>
              <Text className="mb-3 text-base font-semibold text-white">Comparativo mensal</Text>
              <MetricRow label="Mês atual" value={toBRL(currentMonthTotal)} highlight />
              <MetricRow label="Mês anterior" value={toBRL(previousMonthTotal)} />
              <MetricRow label="Variação" value={`${monthVariation >= 0 ? '+' : ''}${monthVariation.toFixed(1)}%`} tone={monthVariation >= 0 ? 'good' : 'bad'} />
              <MetricRow label="Lançamentos no mês atual" value={`${currentMonthCount}`} />
              <MetricRow label="Lançamentos no mês anterior" value={`${previousMonthCount}`} />
            </SubmenuActionsCard>

            <SubmenuActionsCard>
              <Text className="mb-3 text-base font-semibold text-white">Comparativo 7 dias</Text>
              <MetricRow label="Últimos 7 dias" value={toBRL(last7Total)} highlight />
              <MetricRow label="7 dias anteriores" value={toBRL(prev7Total)} />
              <MetricRow label="Variação" value={`${weekVariation >= 0 ? '+' : ''}${weekVariation.toFixed(1)}%`} tone={weekVariation >= 0 ? 'good' : 'bad'} />
            </SubmenuActionsCard>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricRow({
  label,
  value,
  tone,
  highlight,
}: {
  label: string;
  value: string;
  tone?: 'good' | 'bad';
  highlight?: boolean;
}) {
  const toneClass = tone === 'good' ? 'text-green-400' : tone === 'bad' ? 'text-red-400' : highlight ? 'text-[#FF6B35]' : 'text-white';
  return (
    <View className="mb-2 flex-row items-center justify-between rounded-lg bg-[#1A1A1A] px-3 py-2">
      <Text className="text-sm text-[#9CA3AF]">{label}</Text>
      <Text className={`text-sm font-semibold ${toneClass}`}>{value}</Text>
    </View>
  );
}

function toBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
