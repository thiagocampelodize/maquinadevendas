import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DollarSign } from 'lucide-react-native';
import { Animated, Platform, Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { calculateLinearProjection } from '@/domain/forecast/forecastCalculator';
import { getBrazilMonthString } from '@/utils/dateUtils';

import { HomeHeader } from '@/components/home/HomeHeader';
import { HomeMetrics } from '@/components/home/HomeMetrics';
import { PerformanceRanking } from '@/components/home/PerformanceRanking';
import { RankingModal } from '@/components/home/RankingModal';
import { Button } from '@/components/ui/Button';
import { ErrorScreen } from '@/components/ui/ErrorScreen';
import { Select } from '@/components/ui/Select';
import { useEntranceAnimation } from '@/components/ui/useEntranceAnimation';
import { ENTRANCE_ANIMATION_TOKENS } from '@/constants/animationTokens';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { markFirstScreenRendered } from '@/lib/bootstrap-diagnostics';

function buildDashboardMonthOptions() {
  const options: Array<{ label: string; value: string }> = [];
  const base = new Date();
  for (let i = 0; i < 8; i += 1) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^./, (c) => c.toUpperCase());
    options.push({ label, value });
  }
  return options;
}

export default function VendedorHomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const contentWidth = isDesktop ? Math.min(width - 40, 1180) : width - 32;

  const monthOptions = useMemo(() => buildDashboardMonthOptions(), []);
  const currentMonth = useMemo(() => getBrazilMonthString(), []);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const [refreshing, setRefreshing] = useState(false);
  const [isStartingTask, setIsStartingTask] = useState(false);
  const [showRankingModal, setShowRankingModal] = useState(false);
  const startTaskTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disableEntranceAnimation = Platform.OS === 'ios';

  const headerStyle = useEntranceAnimation({ ...ENTRANCE_ANIMATION_TOKENS.dashboard, index: 0, disabled: disableEntranceAnimation });
  const metricsStyle = useEntranceAnimation({ ...ENTRANCE_ANIMATION_TOKENS.dashboard, index: 1, disabled: disableEntranceAnimation });
  const rankingStyle = useEntranceAnimation({ ...ENTRANCE_ANIMATION_TOKENS.dashboard, index: 2, disabled: disableEntranceAnimation });
  const actionsStyle = useEntranceAnimation({ ...ENTRANCE_ANIMATION_TOKENS.dashboard, index: 3, disabled: disableEntranceAnimation });

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
  } = useDashboardData(selectedMonth);

  useEffect(() => {
    markFirstScreenRendered('vendedor-dashboard');
  }, []);

  // Dados próprios do vendedor (alinhado com o web)
  const myData = useMemo(() => {
    if (!user?.id) return null;
    return salesTeam.find((s) => s.id === user.id) || null;
  }, [salesTeam, user?.id]);

  const displayGoal = myData?.goal ?? monthlyGoal;
  const displaySales = myData?.sales ?? currentSales;
  const displayProjection = useMemo(
    () => (myData ? calculateLinearProjection(myData.sales, currentDay, daysInMonth).projection : projection),
    [myData, currentDay, daysInMonth, projection],
  );
  const displayPercentage = myData?.percentageOfGoal ?? percentageComplete;

  const status = useMemo(() => {
    if (displayGoal === 0) {
      return {
        color: 'bg-[#16A34A]',
        title: 'Meta definida? 🤔',
        subtitle: `${user?.name || 'Vendedor'} • Configure suas metas com o gestor`,
      };
    }

    const difference = displayProjection - displayGoal;
    const percentageNeeded = (displayGoal / daysInMonth) * currentDay;
    const performance = percentageNeeded > 0 ? (displaySales / percentageNeeded) * 100 : 0;

    if (performance >= 100) {
      return {
        color: 'bg-[#16A34A]',
        title: 'Previsão: Meta Batida! 🎯',
        subtitle: `${user?.name || 'Vendedor'} • ${displayProjection.toLocaleString('pt-BR', {
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
  }, [currentDay, displaySales, daysInMonth, displayGoal, displayProjection, user?.name]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const handleStartTask = useCallback(async () => {
    setIsStartingTask(true);
    router.push('/(vendedor)/rotina');
    if (startTaskTimeoutRef.current) {
      clearTimeout(startTaskTimeoutRef.current);
    }
    startTaskTimeoutRef.current = setTimeout(() => setIsStartingTask(false), 300);
  }, [router]);

  useEffect(() => {
    return () => {
      if (startTaskTimeoutRef.current) {
        clearTimeout(startTaskTimeoutRef.current);
      }
    };
  }, []);

  if (!user?.company_id) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background px-8" style={{ backgroundColor: '#0A0A0A' }}>
        <Text className="mb-2 text-xl font-bold text-white">Painel indisponível</Text>
        <Text className="text-center text-text-muted">
          Sua conta não tem uma empresa vinculada. É necessário ter uma empresa para visualizar o painel.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ backgroundColor: '#0A0A0A' }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF6B35" />
        }
      >
        <View style={{ width: contentWidth, alignSelf: 'center', gap: 16 }}>
          {isLoading && !refreshing ? (
            // Loading inline — não substitui o layout inteiro
            <View className="flex-1 items-center justify-center py-20">
              <Text className="text-[#FF6B35]">Carregando painel...</Text>
            </View>
          ) : error ? (
            <ErrorScreen
              message={error}
              onRetry={() => void reload()}
              fullScreen={false}
            />
          ) : (
            <>
              <Animated.View style={headerStyle}>
                <HomeHeader
                  statusTitle={status.title}
                  statusSubtitle={status.subtitle}
                  statusColor={status.color}
                />
              </Animated.View>

              <View className="rounded-2xl border border-border bg-surface p-3 gap-2">
                <Select
                  label="Mês de referência"
                  value={selectedMonth}
                  options={monthOptions}
                  onValueChange={setSelectedMonth}
                />
                <Pressable
                  disabled={selectedMonth === currentMonth}
                  onPress={() => setSelectedMonth(currentMonth)}
                  className={`h-10 items-center justify-center rounded-lg border border-[#FF6B35] ${selectedMonth === currentMonth ? 'opacity-50' : 'opacity-100'}`}
                >
                  <Text className="text-sm font-semibold text-[#FF6B35]">Mês atual</Text>
                </Pressable>
                <Text className="text-xs text-[#F59E0B]">
                  Ranking e metas individuais exibem o valor configurado para o período selecionado.
                </Text>
              </View>

              <Animated.View style={metricsStyle}>
                <HomeMetrics
                  monthlyGoal={displayGoal}
                  currentSales={displaySales}
                  projection={displayProjection}
                  percentageComplete={displayPercentage}
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
                      <Button
                        className="bg-white"
                        textStyle={{ color: '#FF6B35' }}
                        size="sm"
                        loading={isStartingTask}
                        onPress={handleStartTask}
                      >
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

                  <View className="rounded-2xl border border-border bg-surface p-4">
                    <View className="mb-3 flex-row items-center gap-2">
                      <View className="rounded-lg bg-card-elevated p-2">
                        <DollarSign stroke="#FF6B35" size={18} />
                      </View>
                      <Text className="text-lg font-semibold text-white">Lançar Vendas</Text>
                    </View>
                    <Text className="mb-4 text-sm text-text-muted">Registre suas vendas do dia.</Text>
                    <Button
                      variant="outline"
                      className="h-12 rounded-xl bg-card-elevated"
                      onPress={() => router.push('/(vendedor)/vendas')}
                    >
                      Acessar Lançamento
                    </Button>
                  </View>
                </Animated.View>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <RankingModal
        isOpen={showRankingModal}
        onClose={() => setShowRankingModal(false)}
        salesTeam={salesTeam}
        currentDay={currentDay}
        daysInMonth={daysInMonth}
      />
    </View>
  );
}
