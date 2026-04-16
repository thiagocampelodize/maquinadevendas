import { Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';

interface RepresentativesSummaryProps {
  totalReturns: number;
  returnsShare: number;
  sellersHitGoalCount: number;
  totalSellers: number;
}

const brl = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

export function RepresentativesSummary({
  totalReturns,
  returnsShare,
  sellersHitGoalCount,
  totalSellers,
}: RepresentativesSummaryProps) {
  return (
    <Card>
      <Text className="text-xs font-bold uppercase tracking-[2px] text-text-muted">Representantes</Text>
      <Text className="mt-1 text-lg font-semibold text-white">Panorama consolidado da equipe</Text>

      <View className="mt-4 gap-3">
        <View className="rounded-xl border border-[#404040] bg-card-elevated p-4">
          <Text className="text-xs text-text-muted">Devolucoes</Text>
          <Text className="mt-2 text-2xl font-bold text-white">{brl(totalReturns)}</Text>
        </View>

        <View className="rounded-xl border border-[#404040] bg-card-elevated p-4">
          <Text className="text-xs text-text-muted">Peso das devolucoes</Text>
          <Text className="mt-2 text-2xl font-bold text-white">{returnsShare.toFixed(1)}%</Text>
          <Text className="mt-1 text-xs text-text-muted">{returnsShare.toFixed(1)}% do faturamento</Text>
        </View>

        <View className="rounded-xl border border-[#404040] bg-card-elevated p-4">
          <Text className="text-xs text-text-muted">Bateram a meta</Text>
          <Text className="mt-2 text-2xl font-bold text-white">
            {sellersHitGoalCount} de {totalSellers}
          </Text>
          <Text className="mt-1 text-xs text-text-muted">vendedores bateram a meta no mes</Text>
        </View>
      </View>
    </Card>
  );
}
