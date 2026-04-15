import { X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MODAL_ANIMATION_PRESETS, useModalAnimation } from '@/components/ui/useModalAnimation';

import { calculateLinearProjection } from '@/domain/forecast/forecastCalculator';
import type { SellerRanking } from '@/types';

interface RankingModalProps {
  isOpen: boolean;
  onClose: () => void;
  salesTeam: SellerRanking[];
  currentDay: number;
  daysInMonth: number;
}

export function RankingModal({ isOpen, onClose, salesTeam, currentDay, daysInMonth }: RankingModalProps) {
  const insets = useSafeAreaInsets();
  const { shouldRender, animatedBackdropStyle, animatedContentStyle } = useModalAnimation(
    isOpen,
    MODAL_ANIMATION_PRESETS.sheet
  );
  const [rankingView, setRankingView] = useState<'value' | 'percentage'>('value');
  const [search, setSearch] = useState('');

  const currentRanking = useMemo(() => {
    const filtered = salesTeam.filter((s) => s.name.toLowerCase().includes(search.toLowerCase().trim()));
    if (rankingView === 'value') return [...filtered].sort((a, b) => b.sales - a.sales);
    return [...filtered].sort((a, b) => b.percentageOfGoal - a.percentageOfGoal);
  }, [rankingView, salesTeam, search]);

  if (!shouldRender) {
    return null;
  }

  return (
    <Modal visible={shouldRender} animationType="none" transparent onRequestClose={onClose}>
      <Animated.View className="flex-1 bg-black/80" style={animatedBackdropStyle}>
        <Animated.View
          className="flex-1 rounded-t-2xl border border-[#2D2D2D] bg-[#111111]"
          style={[{ marginTop: Math.max(insets.top + 8, 48), paddingBottom: Math.max(insets.bottom, 8) }, animatedContentStyle]}
        >
          <View className="flex-row items-center justify-between border-b border-[#2D2D2D] p-4">
            <Text className="text-lg font-semibold text-white">Ranking Completo</Text>
            <Pressable onPress={onClose}>
              <X stroke="#FFFFFF" size={20} />
            </Pressable>
          </View>

          <View className="flex-row gap-2 p-4">
            <Pressable
              onPress={() => setRankingView('value')}
              className={`flex-1 rounded-md px-3 py-2 ${rankingView === 'value' ? 'bg-[#FF6B35]' : 'bg-[#262626]'}`}
            >
              <Text className="text-center text-sm text-white">Por Valor</Text>
            </Pressable>
            <Pressable
              onPress={() => setRankingView('percentage')}
              className={`flex-1 rounded-md px-3 py-2 ${rankingView === 'percentage' ? 'bg-[#FF6B35]' : 'bg-[#262626]'}`}
            >
              <Text className="text-center text-sm text-white">Por % Meta</Text>
            </Pressable>
          </View>

          <View className="px-4 pb-3">
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar vendedor..."
              placeholderTextColor="#6B7280"
              className="rounded-lg border border-[#2D2D2D] bg-[#1A1A1A] px-3 py-2 text-white"
            />
          </View>

          <ScrollView className="flex-1 px-4" contentContainerStyle={{ gap: 10, paddingBottom: 24 }}>
            {currentRanking.length === 0 ? (
              <View className="rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] p-4">
                <Text className="text-center text-sm text-[#9CA3AF]">Nenhum vendedor encontrado.</Text>
              </View>
            ) : null}

            {currentRanking.map((seller, index) => {
              const forecast = calculateLinearProjection(seller.sales, currentDay, daysInMonth).projection;
              const goalIsValid = !!seller.hasValidGoal;
              const missing = goalIsValid ? seller.goal - seller.sales : 0;
              const willHitGoal = goalIsValid && forecast >= seller.goal;

              return (
                <View key={seller.id} className="rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] p-3">
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-white">{index + 1}. {seller.name}</Text>
                    <Text className="text-xs text-[#9CA3AF]">
                      {goalIsValid ? `${seller.percentageOfGoal.toFixed(1)}% da meta` : 'Sem meta definida'}
                    </Text>
                  </View>
                  <View className="flex-row flex-wrap gap-2">
                    <Cell label="Acumulado" value={seller.sales} money />
                    <Cell label="Meta" value={goalIsValid ? seller.goal : null} money />
                    <Cell label="Falta" value={goalIsValid ? missing : null} money />
                    <Cell label="Previsao" value={forecast} money highlight />
                    <Cell label="Bate?" textValue={goalIsValid ? (willHitGoal ? 'SIM' : 'NAO') : 'N/A'} />
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function Cell({
  label,
  value,
  money,
  highlight,
  textValue,
}: {
  label: string;
  value?: number | null;
  money?: boolean;
  highlight?: boolean;
  textValue?: string;
}) {
  const content = textValue
    ? textValue
    : value === null || value === undefined
      ? 'Sem meta'
      : money
        ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
        : value.toLocaleString('pt-BR');

  return (
    <View className={`min-w-[90px] rounded-md p-2 ${highlight ? 'bg-[#FF6B351A]' : 'bg-[#262626]'}`}>
      <Text className="text-[11px] text-[#9CA3AF]">{label}</Text>
      <Text className={`text-xs font-semibold ${highlight ? 'text-[#FF6B35]' : 'text-white'}`}>{content}</Text>
    </View>
  );
}
