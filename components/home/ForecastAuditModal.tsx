import { X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MODAL_ANIMATION_PRESETS, useModalAnimation } from '@/components/ui/useModalAnimation';

import { calculateForecastMetrics } from '@/domain/forecast/forecastCalculator';
import type { SellerRanking } from '@/types';

interface ForecastAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthlyGoal: number;
  currentSales: number;
  currentDay: number;
  daysInMonth: number;
  salesTeam: SellerRanking[];
}

export function ForecastAuditModal({
  isOpen,
  onClose,
  monthlyGoal,
  currentSales,
  currentDay,
  daysInMonth,
  salesTeam,
}: ForecastAuditModalProps) {
  const insets = useSafeAreaInsets();
  const { shouldRender, animatedBackdropStyle, animatedContentStyle } = useModalAnimation(
    isOpen,
    MODAL_ANIMATION_PRESETS.sheet
  );
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'will_hit' | 'wont_hit'>('all');
  const [sortBy, setSortBy] = useState<'projection_desc' | 'missing_desc' | 'name_asc' | 'sales_desc' | 'goal_desc'>(
    'projection_desc'
  );

  const teamForecast = calculateForecastMetrics({
    currentSales,
    monthlyGoal,
    daysElapsed: currentDay,
    daysInMonth,
  });

  const summaryAndRows = useMemo(() => {
    const mapped = salesTeam
      .map((seller) => {
        const goalIsValid = !!seller.hasValidGoal;
        const metrics = calculateForecastMetrics({
          currentSales: seller.sales,
          monthlyGoal: goalIsValid ? seller.goal : 0,
          daysElapsed: currentDay,
          daysInMonth,
        });

        return {
          seller,
          metrics,
          goalIsValid,
          missing: goalIsValid ? Math.max(0, metrics.monthlyGoal - metrics.currentSales) : 0,
          willHitGoal: goalIsValid && metrics.projection >= metrics.monthlyGoal,
        };
      });

    const rowsWithGoal = mapped.filter((row) => row.goalIsValid);
    const willHit = rowsWithGoal.filter((row) => row.willHitGoal).length;
    const summary = {
      total: rowsWithGoal.length,
      withoutGoal: mapped.length - rowsWithGoal.length,
      willHit,
      wontHit: rowsWithGoal.length - willHit,
    };

    const filtered = mapped.filter((row) => {
      if (statusFilter === 'will_hit' && (!row.goalIsValid || !row.willHitGoal)) return false;
      if (statusFilter === 'wont_hit' && (!row.goalIsValid || row.willHitGoal)) return false;
      if (!search.trim()) return true;
      return row.seller.name.toLowerCase().includes(search.toLowerCase().trim());
    });

      const sorted = [...filtered].sort((a, b) => {
        if (sortBy === 'projection_desc') return b.metrics.projection - a.metrics.projection;
        if (sortBy === 'missing_desc') return b.missing - a.missing;
        if (sortBy === 'sales_desc') return b.metrics.currentSales - a.metrics.currentSales;
        if (sortBy === 'goal_desc') return b.metrics.monthlyGoal - a.metrics.monthlyGoal;
        return a.seller.name.localeCompare(b.seller.name, 'pt-BR');
      });

    return { summary, rows: sorted };
  }, [currentDay, daysInMonth, salesTeam, search, sortBy, statusFilter]);

  return (
    <Modal visible={shouldRender} animationType="none" transparent onRequestClose={onClose}>
      <Animated.View className="flex-1 bg-black/80" style={animatedBackdropStyle}>
        <Animated.View
          className="flex-1 rounded-t-2xl border border-[#2D2D2D] bg-[#111111]"
          style={[{ marginTop: Math.max(insets.top + 8, 48), paddingBottom: Math.max(insets.bottom, 8) }, animatedContentStyle]}
        >
          <View className="flex-row items-center justify-between border-b border-[#2D2D2D] p-4">
            <Text className="text-lg font-semibold text-white">Auditoria de Previsao</Text>
            <Pressable onPress={onClose}>
              <X stroke="#FFFFFF" size={20} />
            </Pressable>
          </View>

          <ScrollView className="flex-1 p-4" contentContainerStyle={{ gap: 10, paddingBottom: 28 }}>
            <View className="rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] p-4">
              <Text className="mb-1 text-sm text-[#9CA3AF]">Formula oficial</Text>
              <Text className="text-sm text-white">Previsao = (Vendido acumulado / Dia atual) * Dias do mes</Text>
            </View>

            <View className="rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] p-4">
              <Text className="mb-3 text-base text-white">Time (Consolidado)</Text>
              <View className="flex-row flex-wrap gap-2">
                <Cell label="Vendido" value={teamForecast.currentSales} money />
                <Cell label="Meta" value={teamForecast.monthlyGoal} money />
                <Cell label="Dia atual" value={teamForecast.daysElapsed} />
                <Cell label="Dias mes" value={teamForecast.daysInMonth} />
                <Cell label="Media/dia" value={teamForecast.dailyAverage} money />
                <Cell label="Previsao" value={teamForecast.projection} money highlight />
              </View>
            </View>

            <View className="gap-2 rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] p-3">
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar vendedor..."
                placeholderTextColor="#6B7280"
                className="rounded-lg border border-[#2D2D2D] bg-[#111111] px-3 py-2 text-white"
              />

              <View className="flex-row gap-2">
                <FilterPill
                  label="Todos"
                  active={statusFilter === 'all'}
                  onPress={() => setStatusFilter('all')}
                />
                <FilterPill
                  label="Bate meta"
                  active={statusFilter === 'will_hit'}
                  onPress={() => setStatusFilter('will_hit')}
                />
                <FilterPill
                  label="Nao bate"
                  active={statusFilter === 'wont_hit'}
                  onPress={() => setStatusFilter('wont_hit')}
                />
              </View>

              <View className="flex-row gap-2">
                <FilterPill
                  label="Maior previsao"
                  active={sortBy === 'projection_desc'}
                  onPress={() => setSortBy('projection_desc')}
                />
                <FilterPill
                  label="Maior falta"
                  active={sortBy === 'missing_desc'}
                  onPress={() => setSortBy('missing_desc')}
                />
                <FilterPill
                  label="Maior vendido"
                  active={sortBy === 'sales_desc'}
                  onPress={() => setSortBy('sales_desc')}
                />
                <FilterPill
                  label="Maior meta"
                  active={sortBy === 'goal_desc'}
                  onPress={() => setSortBy('goal_desc')}
                />
                <FilterPill
                  label="Nome A-Z"
                  active={sortBy === 'name_asc'}
                  onPress={() => setSortBy('name_asc')}
                />
              </View>

              <View className="flex-row flex-wrap gap-2 pt-1">
                <Badge label="Total" value={summaryAndRows.summary.total} />
                <Badge label="Sem meta" value={summaryAndRows.summary.withoutGoal} />
                <Badge label="Bate" value={summaryAndRows.summary.willHit} tone="positive" />
                <Badge label="Nao bate" value={summaryAndRows.summary.wontHit} tone="negative" />
                <Badge label="Exibindo" value={summaryAndRows.rows.length} />
              </View>
            </View>

            {summaryAndRows.rows.length === 0 ? (
              <View className="rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] p-4">
                <Text className="text-center text-sm text-[#9CA3AF]">
                  Nenhum vendedor encontrado com os filtros atuais.
                </Text>
              </View>
            ) : null}

            {summaryAndRows.rows.map((row, idx) => (
              <View key={row.seller.id} className="rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] p-3">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-white">{idx + 1}. {row.seller.name}</Text>
                  <Text className={`text-xs ${row.willHitGoal ? 'text-green-400' : row.goalIsValid ? 'text-red-400' : 'text-[#9CA3AF]'}`}>
                    {row.goalIsValid ? (row.willHitGoal ? 'Bate meta' : 'Nao bate') : 'Sem meta'}
                  </Text>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  <Cell label="Vendido" value={row.metrics.currentSales} money />
                  <Cell label="Meta" value={row.goalIsValid ? row.metrics.monthlyGoal : null} money />
                  <Cell label="Falta" value={row.goalIsValid ? row.missing : null} money />
                  <Cell label="Dia atual" value={row.metrics.daysElapsed} />
                  <Cell label="Dias mes" value={row.metrics.daysInMonth} />
                  <Cell label="Media/dia" value={row.metrics.dailyAverage} money />
                  <Cell label="Previsao" value={row.metrics.projection} money highlight />
                </View>
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function FilterPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-3 py-1 ${active ? 'bg-[#FF6B35]' : 'bg-[#262626]'}`}
    >
      <Text className={`text-xs ${active ? 'text-white' : 'text-[#9CA3AF]'}`}>{label}</Text>
    </Pressable>
  );
}

function Badge({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'positive' | 'negative';
}) {
  const className =
    tone === 'positive'
      ? 'bg-green-900/30 text-green-300'
      : tone === 'negative'
        ? 'bg-red-900/30 text-red-300'
        : 'bg-[#262626] text-[#D1D5DB]';

  return (
    <View className={`rounded-full px-2 py-1 ${className}`}>
      <Text className="text-xs">{label}: {value}</Text>
    </View>
  );
}

function Cell({ label, value, money, highlight }: { label: string; value: number | null; money?: boolean; highlight?: boolean }) {
  const text =
    value === null
      ? 'Sem meta'
      : money
        ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
        : value.toLocaleString('pt-BR');

  return (
    <View className={`min-w-[95px] rounded-md p-2 ${highlight ? 'bg-[#FF6B351A]' : 'bg-[#262626]'}`}>
      <Text className="text-[11px] text-[#9CA3AF]">{label}</Text>
      <Text className={`text-xs font-semibold ${highlight ? 'text-[#FF6B35]' : 'text-white'}`}>{text}</Text>
    </View>
  );
}
