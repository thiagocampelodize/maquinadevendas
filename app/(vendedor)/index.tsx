import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { DollarSign } from 'lucide-react-native';
import { Animated, RefreshControl, SafeAreaView, ScrollView, Text, View, useWindowDimensions } from 'react-native';

import { HomeHeader } from '@/components/home/HomeHeader';
import { HomeMetrics } from '@/components/home/HomeMetrics';
import { PerformanceRanking } from '@/components/home/PerformanceRanking';
import { RankingModal } from '@/components/home/RankingModal';
import { Button } from '@/components/ui/Button';
import { useEntranceAnimation } from '@/components/ui/useEntranceAnimation';
import { ENTRANCE_ANIMATION_TOKENS } from '@/constants/animationTokens';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function VendedorHomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const contentWidth = isDesktop ? Math.min(width - 40, 1180) : width - 32;

  const [refreshing, setRefreshing] = useState(false);
  const [isStartingTask, setIsStartingTask] = useState(false);
  const [showRankingModal, setShowRankingModal] = useState(false);

  const headerStyle = useEntranceAnimation({ ...ENTRANCE_ANIMATION_TOKENS.dashboard, index: 0 });
  const metricsStyle = useEntranceAnimation({ ...ENTRANCE_ANIMATION_TOKENS.dashboard, index: 1 });
  const rankingStyle = useEntranceAnimation({ ...ENTRANCE_ANIMATION_TOKENS.dashboard, index: 2 });
  const actionsStyle = useEntranceAnimation({ ...ENTRANCE_ANIMATION_TOKENS.dashboard, index: 3 });

  const {
    isLoading,
    error,
    monthlyGoal,
    currentSales,
    projection,
    percentageComplete,
    salesTeam,
    metGoalReachedCount,
    metGoalReachedRevenue,
    metGoalReachedRevenueShare,
    metGoalProjectedCount,
    metGoalProjectedRevenue,
    metGoalProjectedRevenueShare,
    currentDay,
    daysInMonth,
    reload,
  } = useDashboardData();

  const status = useMemo(() => {
    if (monthlyGoal === 0) {
      return {
        color: 'bg-[#16A34A]',
        title: 'Meta definida? 🤔',
        subtitle: `${user?.name || 'Vendedor'} • Configure suas metas com o gestor`,
      };
    }

    const difference = projection - monthlyGoal;
    const percentageNeeded = (monthlyGoal / daysInMonth) * currentDay;
    const performance = percentageNeeded > 0 ? (currentSales / percentageNeeded) * 100 : 0;

    if (performance >= 100) {
      return {
        color: 'bg-[#16A34A]',
        title: 'Previsão: Meta Batida! 🎯',
        subtitle: `${user?.name || 'Vendedor'} • ${projection.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          minimumFractionDigits: 2,
        })}`,
      };
    }

    if (performance >= 85) {
      return {
        color: 'bg-[#FF6B35]',
        title: 'Atenção: Ritmo Abaixo da Meta ⚠️',
        subtitle: `${user?.name || 'Vendedor'} • Faltam ${Math.abs(difference).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          minimumFractionDigits: 2,
        })}`,
      };
    }

    return {
      color: 'bg-[#DC2626]',
      title: 'Urgente: Muito Abaixo da Meta! 🚨',
      subtitle: `${user?.name || 'Vendedor'} • Faltam ${Math.abs(difference).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
      })}`,
    };
  }, [currentDay, currentSales, daysInMonth, monthlyGoal, projection, user?.name]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const handleStartTask = async () => {
    setIsStartingTask(true);
    router.push('/(vendedor)/rotina');
    setTimeout(() => setIsStartingTask(false), 300);
  };

  if (!user?.company_id) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black px-8">
        <Text className="mb-2 text-xl font-bold text-white">Painel indisponível</Text>
        <Text className="text-center text-[#9CA3AF]">
          Sua conta não tem uma empresa vinculada. É necessário ter uma empresa para visualizar o painel.
        </Text>
      </SafeAreaView>
    );
  }

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black">
        <Text className="text-[#FF6B35]">Carregando painel...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black px-8">
        <Text className="text-center text-red-500">Erro ao carregar dados: {error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF6B35" />}
      >
        <View style={{ width: contentWidth, alignSelf: 'center', gap: 16 }}>
          <Animated.View style={headerStyle}>
            <HomeHeader statusTitle={status.title} statusSubtitle={status.subtitle} statusColor={status.color} />
          </Animated.View>

          <Animated.View style={metricsStyle}>
            <HomeMetrics
              monthlyGoal={monthlyGoal}
              currentSales={currentSales}
              projection={projection}
              percentageComplete={percentageComplete}
              metGoalReachedCount={metGoalReachedCount}
              metGoalReachedRevenue={metGoalReachedRevenue}
              metGoalReachedRevenueShare={metGoalReachedRevenueShare}
              metGoalProjectedCount={metGoalProjectedCount}
              metGoalProjectedRevenue={metGoalProjectedRevenue}
              metGoalProjectedRevenueShare={metGoalProjectedRevenueShare}
              currentDay={currentDay}
              daysInMonth={daysInMonth}
            />
          </Animated.View>

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
            <Animated.View style={[{ flex: isDesktop ? 2 : 1 }, rankingStyle]}>
              <PerformanceRanking
                salesTeam={salesTeam}
                currentDay={currentDay}
                daysInMonth={daysInMonth}
                onOpenModal={() => setShowRankingModal(true)}
                showMessageAction={false}
              />
            </Animated.View>

            <Animated.View style={[{ flex: isDesktop ? 1 : 1 }, actionsStyle]} className="gap-4">
              <View className="rounded-2xl border border-[#FF6B35] bg-[#FF6B35] p-4">
                <View className="mb-3 flex-row items-center justify-between">
                  <Text className="text-lg font-semibold text-white">Próxima Tarefa</Text>
                  <Button className="bg-white" textStyle={{ color: '#FF6B35' }} size="sm" loading={isStartingTask} onPress={handleStartTask}>
                    {isStartingTask ? 'Iniciando...' : 'Iniciar'}
                  </Button>
                </View>
                <Text className="text-sm text-white/90">
                  {new Date().getHours() < 12
                    ? '☀️ Checklist da Manhã - Abertura'
                    : new Date().getHours() < 17
                      ? '🌤️ Checklist do Meio-dia - Acompanhamento'
                      : '🌙 Checklist da Noite - Fechamento'}
                </Text>
              </View>

              <View className="rounded-2xl border border-[#2D2D2D] bg-[#111111] p-4">
                <View className="mb-3 flex-row items-center gap-2">
                  <View className="rounded-lg bg-[#262626] p-2">
                    <DollarSign stroke="#FF6B35" size={18} />
                  </View>
                  <Text className="text-lg font-semibold text-white">Lançar Vendas</Text>
                </View>
                <Text className="mb-4 text-sm text-[#9CA3AF]">Registre suas vendas do dia.</Text>
                <Button variant="outline" className="h-12 rounded-xl bg-[#262626]" onPress={() => router.push('/(vendedor)/vendas')}>
                  Acessar Lançamento
                </Button>
              </View>
            </Animated.View>
          </View>
        </View>
      </ScrollView>

      <RankingModal
        isOpen={showRankingModal}
        onClose={() => setShowRankingModal(false)}
        salesTeam={salesTeam}
        currentDay={currentDay}
        daysInMonth={daysInMonth}
      />
    </SafeAreaView>
  );
}
