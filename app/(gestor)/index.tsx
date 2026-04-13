import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  Animated,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { ForecastAuditModal } from "@/components/home/ForecastAuditModal";
import { CriticalGoalBanner } from "@/components/home/CriticalGoalBanner";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HomeMetrics } from "@/components/home/HomeMetrics";
import { HomeQuickActions } from "@/components/home/HomeQuickActions";
import { Messages } from "@/components/home/Messages";
import { MethodAdherenceReport } from "@/components/home/MethodAdherenceReport";
import { PerformanceRanking } from "@/components/home/PerformanceRanking";
import { RepresentativesSummary } from "@/components/home/RepresentativesSummary";
import { RankingModal } from "@/components/home/RankingModal";
import { GlobalMessageModal } from "@/components/modals/GlobalMessageModal";
import { SendMessageModal } from "@/components/modals/SendMessageModal";
import { useEntranceAnimation } from "@/components/ui/useEntranceAnimation";
import { ENTRANCE_ANIMATION_TOKENS } from "@/constants/animationTokens";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { companiesService } from "@/services/companiesService";
import type { SellerRanking } from "@/types";

export default function GestorHomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const [refreshing, setRefreshing] = useState(false);
  const [isStartingTask, setIsStartingTask] = useState(false);
  const [showRankingModal, setShowRankingModal] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [showAdherenceModal, setShowAdherenceModal] = useState(false);
  const [showForecastAuditModal, setShowForecastAuditModal] = useState(false);
  const [showGlobalMessageModal, setShowGlobalMessageModal] = useState(false);
  const [showSendMessageModal, setShowSendMessageModal] = useState(false);
  const startTaskTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [companyName, setCompanyName] = useState("Operacao");
  const [isCriticalBannerDismissed, setIsCriticalBannerDismissed] = useState(false);
  const [selectedSellerForMessage, setSelectedSellerForMessage] =
    useState<SellerRanking | null>(null);

  const headerEntranceStyle = useEntranceAnimation({
    ...ENTRANCE_ANIMATION_TOKENS.dashboard,
    index: 0,
  });
  const metricsEntranceStyle = useEntranceAnimation({
    ...ENTRANCE_ANIMATION_TOKENS.dashboard,
    index: 1,
  });
  const rankingEntranceStyle = useEntranceAnimation({
    ...ENTRANCE_ANIMATION_TOKENS.dashboard,
    index: 2,
  });
  const actionsEntranceStyle = useEntranceAnimation({
    ...ENTRANCE_ANIMATION_TOKENS.dashboard,
    index: 3,
  });

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
    totalReturns,
    returnsShare,
    totalSellers,
    currentDay,
    daysInMonth,
    reload,
  } = useDashboardData();

  useEffect(() => {
    let isMounted = true;

    const loadCompanyName = async () => {
      if (!user?.company_id) {
        if (isMounted) setCompanyName("Operacao");
        return;
      }

      const company = await companiesService.getCompanyById(user.company_id);
      if (isMounted) {
        setCompanyName(company?.name || "Operacao");
      }
    };

    void loadCompanyName();

    return () => {
      isMounted = false;
    };
  }, [user?.company_id]);

  useEffect(() => {
    setIsCriticalBannerDismissed(false);
  }, [user?.company_id]);

  const proportionalGoal = useMemo(
    () => (monthlyGoal > 0 ? monthlyGoal * (currentDay / daysInMonth) : 0),
    [currentDay, daysInMonth, monthlyGoal],
  );
  const proportionalPercentage = useMemo(
    () => (proportionalGoal > 0 ? (currentSales / proportionalGoal) * 100 : 0),
    [currentSales, proportionalGoal],
  );
  const missingAmount = useMemo(
    () => Math.max(0, monthlyGoal - currentSales),
    [currentSales, monthlyGoal],
  );

  // Banner só aparece quando os dados já carregaram (isLoading = false)
  const shouldShowCriticalBanner =
    !isLoading &&
    monthlyGoal > 0 &&
    proportionalPercentage < 60 &&
    missingAmount > 0 &&
    !isCriticalBannerDismissed;

  const status = useMemo(() => {
    if (monthlyGoal === 0) {
      return {
        color: "bg-[#16A34A]",
        title: "Meta Definida? 🤔",
        subtitle: `${user?.name || "Gestor"} • Configure suas metas`,
      };
    }

    const difference = projection - monthlyGoal;
    const percentageNeeded = (monthlyGoal / daysInMonth) * currentDay;
    const performance =
      percentageNeeded > 0 ? (currentSales / percentageNeeded) * 100 : 0;

    if (shouldShowCriticalBanner) {
      return {
        color: "bg-[#FF6B35]",
        title: "Panorama do Mes",
        subtitle: `${user?.name || "Gestor"} • Projecao ${projection.toLocaleString(
          "pt-BR",
          { style: "currency", currency: "BRL", minimumFractionDigits: 2 },
        )}`,
      };
    }

    if (performance >= 100) {
      return {
        color: "bg-[#16A34A]",
        title: "Previsao: Meta Batida! 🎯",
        subtitle: `${user?.name || "Gestor"} • ${projection.toLocaleString(
          "pt-BR",
          { style: "currency", currency: "BRL", minimumFractionDigits: 2 },
        )}`,
      };
    }

    if (performance >= 85) {
      return {
        color: "bg-[#FF6B35]",
        title: "Atencao: Ritmo Abaixo da Meta ⚠️",
        subtitle: `${user?.name || "Gestor"} • Faltam ${Math.abs(
          difference,
        ).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
          minimumFractionDigits: 2,
        })}`,
      };
    }

    return {
      color: "bg-[#DC2626]",
      title: "Urgente: Muito Abaixo da Meta! 🚨",
      subtitle: `${user?.name || "Gestor"} • Faltam ${Math.abs(
        difference,
      ).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
      })}`,
    };
  }, [currentDay, currentSales, daysInMonth, monthlyGoal, projection, shouldShowCriticalBanner, user?.name]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const handleStartTask = useCallback(async () => {
    setIsStartingTask(true);
    router.push("/(gestor)/rotina");
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

  const handleOpenMessage = useCallback((seller: SellerRanking) => {
    setSelectedSellerForMessage(seller);
    setShowSendMessageModal(true);
  }, []);

  if (!user?.company_id) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black px-8">
        <Text className="mb-2 text-xl font-bold text-white">
          Painel de Controle Indisponivel
        </Text>
        <Text className="text-center text-[#9CA3AF]">
          Sua conta nao tem uma empresa vinculada. E necessario ter uma empresa
          para visualizar o painel.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      {shouldShowCriticalBanner ? (
        <CriticalGoalBanner
          companyName={companyName}
          missingAmount={missingAmount}
          onDismiss={() => setIsCriticalBannerDismissed(true)}
        />
      ) : null}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FF6B35"
          />
        }
      >
        {isLoading && !refreshing ? (
          // Loading inline — não substitui o layout inteiro nem deixa o banner órfão
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-[#FF6B35]">Carregando painel...</Text>
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center py-20 px-8">
            <Text className="text-center text-red-500">
              Erro ao carregar dados: {error}
            </Text>
          </View>
        ) : (
          <>
            {!shouldShowCriticalBanner ? (
              <Animated.View style={headerEntranceStyle}>
                <HomeHeader
                  statusTitle={status.title}
                  statusSubtitle={status.subtitle}
                  statusColor={status.color}
                />
              </Animated.View>
            ) : null}

            <Animated.View style={metricsEntranceStyle}>
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

            <RepresentativesSummary
              totalReturns={totalReturns}
              returnsShare={returnsShare}
              sellersHitGoalCount={metGoalReachedCount}
              totalSellers={totalSellers}
            />

            <View style={{ flexDirection: isDesktop ? "row" : "column", gap: 16 }}>
              <Animated.View style={[{ flex: isDesktop ? 2 : 1 }, rankingEntranceStyle]}>
                <PerformanceRanking
                  salesTeam={salesTeam}
                  currentDay={currentDay}
                  daysInMonth={daysInMonth}
                  onOpenModal={() => setShowRankingModal(true)}
                  onOpenMessage={handleOpenMessage}
                />
              </Animated.View>

              <Animated.View style={[{ flex: isDesktop ? 1 : 1 }, actionsEntranceStyle]}>
                <HomeQuickActions
                  isStartingTask={isStartingTask}
                  currentHour={new Date().getHours()}
                  onStartTask={handleStartTask}
                  onShowMessages={() => setShowMessagesModal(true)}
                  onShowAdherence={() => setShowAdherenceModal(true)}
                  onShowGlobalMessage={() => setShowGlobalMessageModal(true)}
                  onShowForecastAudit={() => setShowForecastAuditModal(true)}
                />
              </Animated.View>
            </View>
          </>
        )}
      </ScrollView>

      <RankingModal
        isOpen={showRankingModal}
        onClose={() => setShowRankingModal(false)}
        salesTeam={salesTeam}
        currentDay={currentDay}
        daysInMonth={daysInMonth}
      />

      <Messages
        isOpen={showMessagesModal}
        onClose={() => setShowMessagesModal(false)}
        monthlyGoal={monthlyGoal}
        currentSales={currentSales}
        currentDay={currentDay}
        daysInMonth={daysInMonth}
        salesTeam={salesTeam}
      />

      <MethodAdherenceReport
        isOpen={showAdherenceModal}
        onClose={() => setShowAdherenceModal(false)}
        userId={user?.id}
        companyId={user?.company_id}
        userRole={user?.role || null}
      />

      <ForecastAuditModal
        isOpen={showForecastAuditModal}
        onClose={() => setShowForecastAuditModal(false)}
        monthlyGoal={monthlyGoal}
        currentSales={currentSales}
        currentDay={currentDay}
        daysInMonth={daysInMonth}
        salesTeam={salesTeam}
      />

      <GlobalMessageModal
        isOpen={showGlobalMessageModal}
        onClose={() => setShowGlobalMessageModal(false)}
        sellers={salesTeam}
        companyId={user?.company_id || undefined}
      />

      {selectedSellerForMessage ? (
        <SendMessageModal
          isOpen={showSendMessageModal}
          onClose={() => {
            setShowSendMessageModal(false);
            setSelectedSellerForMessage(null);
          }}
          seller={selectedSellerForMessage}
          companyId={user?.company_id || undefined}
        />
      ) : null}
    </SafeAreaView>
  );
}