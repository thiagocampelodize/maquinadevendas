import { Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';

interface HomeMetricsProps {
  monthlyGoal: number;
  currentSales: number;
  projection: number;
  percentageComplete: number;
  metGoalReachedCount: number;
  metGoalReachedRevenue: number;
  metGoalReachedRevenueShare: number;
  metGoalProjectedCount: number;
  metGoalProjectedRevenue: number;
  metGoalProjectedRevenueShare: number;
  currentDay: number;
  daysInMonth: number;
}

const brl = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

export function HomeMetrics({
  monthlyGoal,
  currentSales,
  projection,
  percentageComplete,
  metGoalReachedCount,
  metGoalReachedRevenue,
  metGoalReachedRevenueShare,
  metGoalProjectedCount,
  metGoalProjectedRevenue,
  metGoalProjectedRevenueShare,
  currentDay,
  daysInMonth,
}: HomeMetricsProps) {
  const projectionBelow = projection < monthlyGoal;
  const percentageBelow = percentageComplete < (currentDay / daysInMonth) * 100;

  return (
    <View className="gap-3">
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Card>
            <Text className="text-xs text-[#9CA3AF]">Meta</Text>
            <Text className="mt-1 text-2xl font-bold tracking-tight text-white">{brl(monthlyGoal)}</Text>
          </Card>
        </View>
        <View className="flex-1">
          <Card>
            <Text className="text-xs text-[#9CA3AF]">Realizado</Text>
            <Text className="mt-1 text-2xl font-bold tracking-tight text-white">{brl(currentSales)}</Text>
          </Card>
        </View>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Card style={{ borderWidth: 2, borderColor: projectionBelow ? '#DC2626' : '#16A34A' }}>
            <Text className="text-xs text-[#9CA3AF]">Projecao</Text>
            <Text className={`mt-1 text-2xl font-bold tracking-tight ${projectionBelow ? 'text-[#F87171]' : 'text-white'}`}>
              {brl(projection)}
            </Text>
          </Card>
        </View>
        <View className="flex-1">
          <Card style={{ borderWidth: 2, borderColor: percentageBelow ? '#DC2626' : '#16A34A' }}>
            <Text className="text-xs text-[#9CA3AF]">% Atingido</Text>
            <Text className={`mt-1 text-2xl font-bold tracking-tight ${percentageBelow ? 'text-[#F87171]' : 'text-white'}`}>
              {percentageComplete.toFixed(1)}%
            </Text>
          </Card>
        </View>
      </View>

      <View className="gap-3">
        <Card>
          <Text className="text-xs text-[#9CA3AF]">Representatividade (Realizado)</Text>
          <Text className="mt-1 text-base font-semibold text-white">{brl(metGoalReachedRevenue)}</Text>
          <Text className="mt-1 text-xs text-[#9CA3AF]">
            {metGoalReachedRevenueShare.toFixed(1)}% do faturamento • {metGoalReachedCount} vendedor(es)
            bateu(ram) meta
          </Text>
          {metGoalReachedCount === 0 ? (
            <Text className="mt-2 text-[11px] text-[#6B7280]">
              Nenhum vendedor com meta valida bateu meta no periodo.
            </Text>
          ) : null}
        </Card>

        <Card>
          <Text className="text-xs text-[#9CA3AF]">Representatividade (Projecao)</Text>
          <Text className="mt-1 text-base font-semibold text-white">{brl(metGoalProjectedRevenue)}</Text>
          <Text className="mt-1 text-xs text-[#9CA3AF]">
            {metGoalProjectedRevenueShare.toFixed(1)}% do faturamento • {metGoalProjectedCount} vendedor(es)
            com projecao de bater meta
          </Text>
          {metGoalProjectedCount === 0 ? (
            <Text className="mt-2 text-[11px] text-[#6B7280]">
              Nenhum vendedor com meta valida tem projecao de bater meta.
            </Text>
          ) : null}
        </Card>
      </View>
    </View>
  );
}
