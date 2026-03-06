import { subDays, format } from 'date-fns';
import { X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { MODAL_ANIMATION_PRESETS, useModalAnimation } from '@/components/ui/useModalAnimation';
import { checklistService, type PeriodProgress } from '@/services/checklistService';
import { getBrazilDate } from '@/utils/dateUtils';

interface MethodAdherenceReportProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  companyId?: string | null;
  userRole?: 'ADMIN' | 'GESTOR' | 'VENDEDOR' | null;
}

export function MethodAdherenceReport({
  isOpen,
  onClose,
  userId,
  companyId,
  userRole,
}: MethodAdherenceReportProps) {
  const insets = useSafeAreaInsets();
  const { shouldRender, animatedBackdropStyle, animatedContentStyle } = useModalAnimation(
    isOpen,
    MODAL_ANIMATION_PRESETS.sheet
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodProgress, setPeriodProgress] = useState<PeriodProgress[]>([]);

  const loadData = async () => {
    if (!userId || !companyId) {
      setLoading(false);
      setError('Sessao sem usuario/empresa para carregar adesao.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const today = getBrazilDate();
      const start = subDays(today, 6);
      const startDate = format(start, 'yyyy-MM-dd');
      const endDate = format(today, 'yyyy-MM-dd');

      const taskType = userRole === 'VENDEDOR' ? 'vendedor' : 'omc';
      const data = await checklistService.getPeriodProgress(userId, companyId, startDate, endDate, taskType);
      setPeriodProgress(data);
    } catch (err: any) {
      console.error('MethodAdherenceReport loadData error:', err);
      setError(err?.message || 'Erro ao carregar relatorio de adesao');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    void loadData();
  }, [companyId, isOpen, userId, userRole]);

  const overall = useMemo(() => {
    let total = 0;
    let completed = 0;
    periodProgress.forEach((p) => {
      total += p.total;
      completed += p.completed;
    });
    return total > 0 ? (completed / total) * 100 : 0;
  }, [periodProgress]);

  const adherenceByPeriod = useMemo(() => {
    const periods: Array<'morning' | 'midday' | 'afternoon' | 'evening'> = [
      'morning',
      'midday',
      'afternoon',
      'evening',
    ];

    return periods.map((period) => {
      const rows = periodProgress.filter((p) => p.period === period);
      const total = rows.reduce((acc, row) => acc + row.total, 0);
      const completed = rows.reduce((acc, row) => acc + row.completed, 0);
      const percentage = total > 0 ? (completed / total) * 100 : 0;

      return {
        period,
        total,
        completed,
        percentage,
        label:
          period === 'morning'
            ? '☀️ Manha (08:45)'
            : period === 'midday'
              ? '🌤️ Meio-dia (12:00)'
              : period === 'afternoon'
                ? '🌅 Tarde (17:45)'
                : '🌙 Noite (18:00)',
      };
    });
  }, [periodProgress]);

  const heatmapRows = useMemo(() => {
    const dates = Array.from(new Set(periodProgress.map((p) => p.date))).sort((a, b) => a.localeCompare(b));
    const uiPeriods: Array<'morning' | 'midday' | 'afternoon' | 'evening'> = [
      'morning',
      'midday',
      'afternoon',
      'evening',
    ];

    return uiPeriods.map((period) => {
      return {
        period,
        label:
          period === 'morning'
            ? '☀️ Manha'
            : period === 'midday'
              ? '🌤️ Meio-dia'
              : period === 'afternoon'
                ? '🌅 Tarde'
                : '🌙 Noite',
        cells: dates.map((date) => {
          const row = periodProgress.find((p) => p.period === period && p.date === date);
          const pct = row && row.total > 0 ? (row.completed / row.total) * 100 : 0;
          return {
            date,
            completed: row?.completed || 0,
            total: row?.total || 0,
            percentage: pct,
          };
        }),
      };
    });
  }, [periodProgress]);

  const getColorByPercentage = (percentage: number) => {
    if (percentage >= 80) return '#16A34A';
    if (percentage >= 50) return '#FF6B35';
    return '#DC2626';
  };

  return (
    <Modal visible={shouldRender} animationType="none" transparent onRequestClose={onClose}>
      <Animated.View className="flex-1 bg-black/80" style={animatedBackdropStyle}>
        <Animated.View
          className="flex-1 rounded-t-2xl border border-[#2D2D2D] bg-[#111111]"
          style={[{ marginTop: Math.max(insets.top + 8, 40), paddingBottom: Math.max(insets.bottom, 8) }, animatedContentStyle]}
        >
          <View className="flex-row items-center justify-between border-b border-[#2D2D2D] p-4">
            <Text className="text-lg font-semibold text-white">Relatorio de Adesao ao Metodo OMC</Text>
            <Pressable onPress={onClose}>
              <X stroke="#FFFFFF" size={20} />
            </Pressable>
          </View>

          <ScrollView className="flex-1 p-4" contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
            {loading ? <Text className="text-[#9CA3AF]">Carregando relatorio...</Text> : null}
            {error ? <Text className="text-red-500">{error}</Text> : null}

            {!loading && !error && periodProgress.length === 0 ? (
              <View className="rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] p-4">
                <Text className="text-sm text-[#D1D5DB]">Nenhum dado de adesao encontrado nos ultimos 7 dias.</Text>
                <Text className="mt-1 text-xs text-[#9CA3AF]">
                  Verifique se ha tarefas do checklist ativas e progresso registrado no periodo.
                </Text>
                <View className="mt-3">
                  <Button variant="outline" onPress={() => void loadData()}>
                    Recarregar
                  </Button>
                </View>
              </View>
            ) : null}

            {!loading && !error ? (
              <View className="rounded-xl border-2 border-[#2D2D2D] bg-[#1A1A1A] p-4">
                <Text className="text-sm text-[#9CA3AF]">Adesao geral (ultimos 7 dias)</Text>
                <Text
                  className="mt-1 text-4xl font-bold"
                  style={{ color: overall >= 80 ? '#16A34A' : overall >= 50 ? '#FF6B35' : '#DC2626' }}
                >
                  {overall.toFixed(0)}%
                </Text>
                <Text className="mt-2 text-xs text-[#9CA3AF]">
                  {periodProgress.reduce((acc, row) => acc + row.completed, 0)} de{' '}
                  {periodProgress.reduce((acc, row) => acc + row.total, 0)} tarefas
                </Text>
              </View>
            ) : null}

            {!loading && !error ? (
              <View className="gap-3">
                <Text className="text-base font-semibold text-white">Adesao por Periodo do Dia</Text>
                {adherenceByPeriod.map((row) => (
                  <View key={row.period} className="rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] p-4">
                    <View className="mb-2 flex-row items-center justify-between">
                      <Text className="text-sm text-white">{row.label}</Text>
                      <Text className="text-2xl font-bold" style={{ color: getColorByPercentage(row.percentage) }}>
                        {row.percentage.toFixed(0)}%
                      </Text>
                    </View>
                    <Text className="mb-3 text-xs text-[#9CA3AF]">
                      {row.completed} de {row.total} tarefas completadas
                    </Text>
                    <View className="h-2 w-full rounded-full bg-[#404040]">
                      <View
                        className="h-2 rounded-full"
                        style={{ width: `${row.percentage}%`, backgroundColor: getColorByPercentage(row.percentage) }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {!loading && !error ? (
              <View className="rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] p-4">
                <Text className="mb-3 text-base font-semibold text-white">Mapa de Calor - Ultimos 7 Dias</Text>
                {heatmapRows.map((row) => (
                  <View key={row.period} className="mb-2">
                    <Text className="mb-1 text-xs text-[#9CA3AF]">{row.label}</Text>
                    <View className="flex-row gap-1">
                      {row.cells.map((cell) => (
                        <View key={`${row.period}-${cell.date}`} className="items-center">
                          <View
                            className="h-10 w-10 items-center justify-center rounded"
                            style={{ backgroundColor: `${getColorByPercentage(cell.percentage)}33` }}
                          >
                            <Text
                              className="text-[10px] font-bold"
                              style={{ color: getColorByPercentage(cell.percentage) }}
                            >
                              {cell.percentage.toFixed(0)}%
                            </Text>
                          </View>
                          <Text className="mt-1 text-[10px] text-[#6B7280]">{new Date(`${cell.date}T00:00:00`).getDate()}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}

                <View className="mt-4 flex-row justify-center gap-4">
                  <Legend color="#16A34A" label=">= 80%" />
                  <Legend color="#FF6B35" label="50-79%" />
                  <Legend color="#DC2626" label="< 50%" />
                </View>
              </View>
            ) : null}

            {!loading && !error ? (
              <View className="rounded-xl border border-blue-500/40 bg-blue-900/10 p-4">
                <Text className="mb-2 text-sm font-semibold text-blue-300">💡 Insights e Recomendacoes</Text>
                <Text className="text-sm leading-6 text-blue-200">
                  {overall >= 80
                    ? 'Parabens! Sua equipe esta seguindo o Metodo OMC com excelencia. Continue mantendo a consistencia.'
                    : overall >= 50
                      ? 'Atencao: a adesao esta moderada. Foque nos periodos com menor execucao para subir acima de 80%.'
                      : 'Urgente: a baixa adesao ao metodo pode estar comprometendo resultados. Reforce o plano diario e os rituais.'}
                </Text>
              </View>
            ) : null}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1">
      <View className="h-3 w-3 rounded" style={{ backgroundColor: color }} />
      <Text className="text-[10px] text-[#9CA3AF]">{label}</Text>
    </View>
  );
}
