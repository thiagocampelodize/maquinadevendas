import { Text, View } from 'react-native';

import type { Period } from '@/types';

interface ChecklistProgressProps {
  completedCount: number;
  totalCount: number;
  activePeriod: Period;
}

export function ChecklistProgress({ completedCount, totalCount, activePeriod }: ChecklistProgressProps) {
  const label =
    activePeriod === 'morning'
      ? 'Manha (08:45)'
      : activePeriod === 'midday'
        ? 'Meio-dia (12:00)'
        : activePeriod === 'afternoon'
          ? 'Tarde (17:45)'
          : 'Noite (18:00)';

  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <View className="rounded-xl border border-[#404040] bg-card p-4">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-sm text-[#a3a3a3]">Progresso - {label}</Text>
        <Text className="text-sm text-white">
          {completedCount}/{totalCount} concluidas
        </Text>
      </View>

      <View className="h-3 w-full rounded-full bg-card-elevated">
        <View className="h-3 rounded-full bg-[#FF6B35]" style={{ width: `${progressPercentage}%` }} />
      </View>
    </View>
  );
}
