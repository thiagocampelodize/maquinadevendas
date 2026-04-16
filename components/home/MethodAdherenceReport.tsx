import { subDays, format } from 'date-fns';
import { X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  const loadIdRef = useRef(0);

  const loadData = async () => {
    const loadId = ++loadIdRef.current;
    const isCurrentLoad = () => loadId === loadIdRef.current;

    if (!userId || !companyId) {
      if (isCurrentLoad()) {
        setLoading(false);
        setError('Sessao sem usuario/empresa para carregar adesao.');
      }
      return;
    }

    try {
      if (isCurrentLoad()) {
        setLoading(true);
        setError(null);
      }

      const today = getBrazilDate();
      const start = subDays(today, 6);
      const startDate = format(start, 'yyyy-MM-dd');
      const endDate = format(today, 'yyyy-MM-dd');

      const taskType = userRole === 'VENDEDOR' ? 'vendedor' : 'omc';
      const data = await checklistService.getPeriodProgress(userId, companyId, startDate, endDate, taskType);
      if (isCurrentLoad()) {
        setPeriodProgress(data);
      }
    } catch (err: unknown) {
      console.error('MethodAdherenceReport loadData error:', err);
      if (isCurrentLoad()) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar relatorio de adesao');
      }
    } finally {
      if (isCurrentLoad()) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    void loadData();

    return () => {
      loadIdRef.current += 1;
    };
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

  if (!shouldRender) {
    return null;
  }

  return (
    <Modal visible={shouldRender} animationType="none" transparent onRequestClose={onClose}>
      <Animated.View className="flex-1 bg-black/80" style={animatedBackdropStyle}>
        <Animated.View
          className="flex-1 rounded-t-2xl border border-border bg-surface"
          style={[{ marginTop: Math.max(insets.top + 8, 40), paddingBottom: Math.max(insets.bottom, 8) }, animatedContentStyle]}
        >
          <View className="flex-row items-center justify-between border-b border-border p-4">
            <Text className="text-lg font-semibold text-white">Relatorio de Adesao ao Metodo OMC</Text>
            <Pressable onPress={onClose}>
              <X stroke="#FFFFFF" size={20} />
            </Pressable>
          </View>

          <ScrollView className="flex-1 p-4" contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
            {loading ? <Text className="text-text-muted">Carregando relatorio...</Text> : null}
            {error ? <Text className="text-red-500">{error}</Text> : null}

            {!loading && !error && periodProgress.length === 0 ? (
              <View className="rounded-xl border border-border bg-card p-4">
                <Text className="text-sm text-text-secondary">Nenhum dado de adesao encontrado nos ultimos 7 dias.</Text>
                <Text className="mt-1 text-xs text-text-muted">
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
              <View className="rounded-xl border-2 border-border bg-card p-4">
                <Text className="text-sm text-text-muted">Adesao geral (ultimos 7 dias)</Text>
                <Text
                  className="mt-1 text-4xl font-bold"
                  style={{ color: overall >= 80 ? '#16A34A' : overall >= 50 ? '#FF6B35' : '#DC2626' }}
                >
                  {overall.toFixed(0)}%
                </Text>
                <Text className="mt-2 text-xs text-text-muted">
                  {periodProgress.reduce((acc, row) => acc + row.completed, 0)} de{' '}
                  {periodProgress.reduce((acc, row) => acc + row.total, 0)} tarefas
                </Text>
              </View>
            ) : null}

            {!loading && !error ? (
              <View className="gap-3">
                <Text className="text-base font-semibold text-white">Adesao por Periodo do Dia</Text>
                {adherenceByPeriod.map((row) => (
                  <View key={row.period} className="rounded-xl border border-border bg-card p-4">
                    <View className="mb-2 flex-row items-center justify-between">
                      <Text className="text-sm text-white">{row.label}</Text>
                      <Text className="text-2xl font-bold" style={{ color: getColorByPercentage(row.percentage) }}>
                        {row.percentage.toFixed(0)}%
                      </Text>
                    </View>
                    <Text className="mb-3 text-xs text-text-muted">
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
              <View className="rounded-xl border border-border bg-card p-4">
                <Text className="mb-3 text-base font-semibold text-white">Mapa de Calor - Ultimos 7 Dias</Text>
                {heatmapRows.map((row) => (
                  <View key={row.period} className="mb-2">
                    <Text className="mb-1 text-xs text-text-muted">{row.label}</Text>
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
                          <Text className="mt-1 text-[10px] text-text-faint">{new Date(`${cell.date}T00:00:00`).getDate()}</Text>
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
      <Text className="text-[10px] text-text-muted">{label}</Text>
    </View>
  );
}
